import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bull';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRetry } from './entities/transaction-retry.entity';
import {
  RetryConfig,
  RetryAttemptResult,
  TransactionRetryJobData,
  TransactionRetryStatus,
} from './interfaces/transaction-retry.interface';
import { ConfigService } from '@nestjs/config';
import { Transaction } from './entities/transaction.entity';
import { TransactionState } from './enums/transaction-state.enum';

/**
 * Service responsible for managing the transaction retry queue
 * Uses BullMQ for Redis-backed job queuing with persistence
 */
@Injectable()
export class TransactionRetryQueueService implements OnModuleInit {
  private readonly logger = new Logger(TransactionRetryQueueService.name);
  private retryConfig: RetryConfig;

  constructor(
    @InjectQueue('transaction-retry')
    private readonly retryQueue: Queue<TransactionRetryJobData>,
    @InjectRepository(TransactionRetry)
    private readonly retryRepo: Repository<TransactionRetry>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {
    this.retryConfig = this.loadRetryConfig();
  }

  /**
   * Initialize the queue on module startup
   * Cleans up any stale processing jobs
   */
  async onModuleInit(): Promise<void> {
    await this.cleanupStaleJobs();
    this.logger.log('Transaction retry queue initialized');
  }

  /**
   * Load retry configuration from environment or use defaults
   */
  private loadRetryConfig(): RetryConfig {
    return {
      maxAttempts: this.configService.get<number>(
        'TRANSACTION_RETRY_MAX_ATTEMPTS',
        6,
      ),
      baseDelayMs: this.configService.get<number>(
        'TRANSACTION_RETRY_BASE_DELAY_MS',
        1000,
      ),
      maxDelayMs: this.configService.get<number>(
        'TRANSACTION_RETRY_MAX_DELAY_MS',
        300000,
      ), // 5 minutes
      backoffMultiplier: this.configService.get<number>(
        'TRANSACTION_RETRY_BACKOFF_MULTIPLIER',
        2,
      ),
      useJitter: this.configService.get<boolean>(
        'TRANSACTION_RETRY_USE_JITTER',
        true,
      ),
    };
  }

  /**
   * Enqueue a failed transaction for retry
   * Creates a persistent retry record and adds job to BullMQ queue
   */
  async enqueueRetry(
    transactionId: number,
    contractTxId: string,
    transactionXdr: string,
    signature?: string,
    error?: string,
    metadata?: Record<string, unknown>,
  ): Promise<TransactionRetry> {
    const retryId = uuidv4();
    const now = Date.now();

    // Calculate initial retry delay with exponential backoff
    const initialDelay = this.calculateRetryDelay(1);

    // Create persistent retry record
    const retryRecord = this.retryRepo.create({
      retryId,
      transactionId,
      contractTxId,
      status: TransactionRetryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: this.retryConfig.maxAttempts,
      transactionXdr,
      signature,
      lastError: error,
      createdAt: now,
      nextRetryAt: now + initialDelay,
      metadata,
      errorHistory: error
        ? [
            {
              attempt: 0,
              error,
              timestamp: now,
              delayMs: 0,
            },
          ]
        : [],
    });

    const saved = await this.retryRepo.save(retryRecord);

    // Add job to BullMQ queue with delay
    const jobData: TransactionRetryJobData = {
      retryId: saved.retryId,
      transactionId: saved.transactionId,
      contractTxId: saved.contractTxId,
      attemptCount: 0,
      maxAttempts: saved.maxAttempts,
      transactionXdr: saved.transactionXdr,
      signature: saved.signature,
      lastError: saved.lastError,
      createdAt: saved.createdAt,
      nextRetryAt: saved.nextRetryAt || 0,
      metadata: saved.metadata,
    };

    await this.retryQueue.add('retry-transaction', jobData, {
      jobId: retryId,
      delay: initialDelay,
      attempts: 1, // BullMQ will not retry; we handle retries ourselves
      removeOnComplete: false, // Keep for DLQ handling
      removeOnFail: false, // Keep for DLQ handling
    });

    this.logger.log(
      `Enqueued retry for transaction ${transactionId} with retryId ${retryId}, delay ${initialDelay}ms`,
    );

    return saved;
  }

  /**
   * Process a retry attempt
   * Called by the worker processor
   */
  async processRetry(
    retryId: string,
    submitFn: (xdr: string, signature?: string) => Promise<{ hash: string }>,
  ): Promise<RetryAttemptResult> {
    const retryRecord = await this.retryRepo.findOne({
      where: { retryId },
    });

    if (!retryRecord) {
      throw new Error(`Retry record ${retryId} not found`);
    }

    // Check if already completed or cancelled
    if (
      retryRecord.status === TransactionRetryStatus.COMPLETED ||
      retryRecord.status === TransactionRetryStatus.CANCELLED
    ) {
      return {
        success: retryRecord.status === TransactionRetryStatus.COMPLETED,
        moveToDlq: false,
      };
    }

    // Check if max attempts exceeded
    if (retryRecord.attemptCount >= retryRecord.maxAttempts) {
      await this.moveToDlq(retryRecord);
      return {
        success: false,
        moveToDlq: true,
        error: `Max retry attempts (${retryRecord.maxAttempts}) exceeded`,
      };
    }

    // Update status to processing
    retryRecord.status = TransactionRetryStatus.PROCESSING;
    retryRecord.attemptCount += 1;
    await this.retryRepo.save(retryRecord);

    try {
      // Submit the transaction
      const result = await submitFn(
        retryRecord.transactionXdr,
        retryRecord.signature,
      );

      // Success!
      retryRecord.status = TransactionRetryStatus.COMPLETED;
      retryRecord.completedAt = Date.now();
      await this.retryRepo.save(retryRecord);

      // Update the original transaction status if needed
      await this.updateTransactionStatus(
        retryRecord.transactionId,
        result.hash,
      );

      this.logger.log(
        `Retry ${retryId} succeeded on attempt ${retryRecord.attemptCount}`,
      );

      return {
        success: true,
        txHash: result.hash,
        moveToDlq: false,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Record the error
      const errorHistory = retryRecord.errorHistory || [];
      errorHistory.push({
        attempt: retryRecord.attemptCount,
        error: errorMessage,
        timestamp: Date.now(),
        delayMs: 0,
      });

      retryRecord.lastError = errorMessage;
      retryRecord.errorHistory = errorHistory;

      // Check if we should retry or move to DLQ
      if (retryRecord.attemptCount >= retryRecord.maxAttempts) {
        await this.moveToDlq(retryRecord);
        return {
          success: false,
          moveToDlq: true,
          error: errorMessage,
        };
      }

      // Calculate next retry delay
      const nextDelay = this.calculateRetryDelay(retryRecord.attemptCount + 1);
      retryRecord.nextRetryAt = Date.now() + nextDelay;
      retryRecord.status = TransactionRetryStatus.PENDING;
      await this.retryRepo.save(retryRecord);

      // Re-enqueue the job with the new delay
      const jobData: TransactionRetryJobData = {
        retryId: retryRecord.retryId,
        transactionId: retryRecord.transactionId,
        contractTxId: retryRecord.contractTxId,
        attemptCount: retryRecord.attemptCount,
        maxAttempts: retryRecord.maxAttempts,
        transactionXdr: retryRecord.transactionXdr,
        signature: retryRecord.signature,
        lastError: retryRecord.lastError,
        createdAt: retryRecord.createdAt,
        nextRetryAt: retryRecord.nextRetryAt,
        metadata: retryRecord.metadata,
      };

      await this.retryQueue.add('retry-transaction', jobData, {
        jobId: retryId,
        delay: nextDelay,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      });

      this.logger.warn(
        `Retry ${retryId} failed on attempt ${retryRecord.attemptCount}, ` +
          `retrying in ${nextDelay}ms: ${errorMessage}`,
      );

      return {
        success: false,
        moveToDlq: false,
        error: errorMessage,
        nextRetryDelayMs: nextDelay,
      };
    }
  }

  /**
   * Move a transaction retry to the Dead Letter Queue
   */
  private async moveToDlq(retryRecord: TransactionRetry): Promise<void> {
    retryRecord.status = TransactionRetryStatus.DLQ;
    await this.retryRepo.save(retryRecord);

    // Update the original transaction to FAILED state
    await this.transactionRepo.update(retryRecord.transactionId, {
      state: TransactionState.FAILED,
      errorReason: `Retry exhausted: ${retryRecord.lastError || 'Max attempts exceeded'}`,
    });

    this.logger.warn(
      `Retry ${retryRecord.retryId} moved to DLQ after ${retryRecord.attemptCount} attempts`,
    );
  }

  /**
   * Update the original transaction status on success
   */
  private async updateTransactionStatus(
    transactionId: number,
    txHash: string,
  ): Promise<void> {
    await this.transactionRepo.update(transactionId, {
      state: TransactionState.COMPLETED,
      contractState: 'completed',
      completedAt: Date.now(),
      metadata: {
        ...(await this.getTransactionMetadata(transactionId)),
        retryTxHash: txHash,
        retryCompletedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Get transaction metadata helper
   */
  private async getTransactionMetadata(
    transactionId: number,
  ): Promise<Record<string, unknown>> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      select: ['metadata'],
    });
    return transaction?.metadata || {};
  }

  /**
   * Calculate retry delay using exponential backoff with optional jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier, useJitter } =
      this.retryConfig;

    // Exponential backoff: delay = baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);

    // Cap at maximum delay
    delay = Math.min(delay, maxDelayMs);

    // Add jitter to prevent thundering herd
    if (useJitter) {
      const jitter = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      delay = Math.round(delay * jitter);
    }

    return delay;
  }

  /**
   * Get retry status for a transaction
   */
  async getRetryStatus(retryId: string): Promise<TransactionRetry | null> {
    return this.retryRepo.findOne({
      where: { retryId },
    });
  }

  /**
   * Get all retries for a transaction
   */
  async getRetriesForTransaction(
    transactionId: number,
  ): Promise<TransactionRetry[]> {
    return this.retryRepo.find({
      where: { transactionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all DLQ entries
   */
  async getDlqEntries(
    limit = 100,
    offset = 0,
  ): Promise<[TransactionRetry[], number]> {
    return this.retryRepo.findAndCount({
      where: { status: TransactionRetryStatus.DLQ },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Manually retry a DLQ entry
   */
  async retryDlqEntry(retryId: string): Promise<TransactionRetry> {
    const retryRecord = await this.retryRepo.findOne({
      where: { retryId, status: TransactionRetryStatus.DLQ },
    });

    if (!retryRecord) {
      throw new Error(`DLQ entry ${retryId} not found or not in DLQ status`);
    }

    // Reset the retry attempt
    retryRecord.attemptCount = 0;
    retryRecord.status = TransactionRetryStatus.PENDING;
    retryRecord.lastError = undefined;
    retryRecord.errorHistory = [];
    const initialDelay = this.calculateRetryDelay(1);
    retryRecord.nextRetryAt = Date.now() + initialDelay;
    await this.retryRepo.save(retryRecord);

    // Re-enqueue the job
    const jobData: TransactionRetryJobData = {
      retryId: retryRecord.retryId,
      transactionId: retryRecord.transactionId,
      contractTxId: retryRecord.contractTxId,
      attemptCount: 0,
      maxAttempts: retryRecord.maxAttempts,
      transactionXdr: retryRecord.transactionXdr,
      signature: retryRecord.signature,
      createdAt: retryRecord.createdAt,
      nextRetryAt: retryRecord.nextRetryAt || 0,
      metadata: retryRecord.metadata,
    };

    await this.retryQueue.add('retry-transaction', jobData, {
      jobId: retryId,
      delay: initialDelay,
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    });

    this.logger.log(`DLQ entry ${retryId} re-enqueued for retry`);
    return retryRecord;
  }

  /**
   * Cancel a pending retry
   */
  async cancelRetry(retryId: string): Promise<void> {
    const retryRecord = await this.retryRepo.findOne({
      where: { retryId },
    });

    if (!retryRecord) {
      throw new Error(`Retry ${retryId} not found`);
    }

    if (retryRecord.status === TransactionRetryStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed retry');
    }

    if (retryRecord.status === TransactionRetryStatus.DLQ) {
      throw new Error('Cannot cancel a DLQ entry; use retryDlqEntry to retry');
    }

    retryRecord.status = TransactionRetryStatus.CANCELLED;
    await this.retryRepo.save(retryRecord);

    // Remove from queue
    await this.retryQueue.removeJobs(retryId);

    this.logger.log(`Retry ${retryId} cancelled`);
  }

  /**
   * Clean up stale processing jobs on startup
   */
  private async cleanupStaleJobs(): Promise<void> {
    const staleJobs = await this.retryRepo.find({
      where: { status: TransactionRetryStatus.PROCESSING },
    });

    for (const job of staleJobs) {
      // Check if the job has been processing for more than 5 minutes
      const processingTime =
        Date.now() - (job.updatedDate?.getTime() || job.createdAt);
      if (processingTime > 300000) {
        job.status = TransactionRetryStatus.PENDING;
        await this.retryRepo.save(job);
        this.logger.warn(`Cleaned up stale processing job ${job.retryId}`);
      }
    }
  }

  /**
   * Get retry metrics for monitoring
   */
  async getMetrics(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    dlq: number;
    total: number;
  }> {
    const [pending, processing, completed, failed, cancelled, dlq] =
      await Promise.all([
        this.retryRepo.count({
          where: { status: TransactionRetryStatus.PENDING },
        }),
        this.retryRepo.count({
          where: { status: TransactionRetryStatus.PROCESSING },
        }),
        this.retryRepo.count({
          where: { status: TransactionRetryStatus.COMPLETED },
        }),
        this.retryRepo.count({
          where: { status: TransactionRetryStatus.FAILED },
        }),
        this.retryRepo.count({
          where: { status: TransactionRetryStatus.CANCELLED },
        }),
        this.retryRepo.count({ where: { status: TransactionRetryStatus.DLQ } }),
      ]);

    return {
      pending,
      processing,
      completed,
      failed,
      cancelled,
      dlq,
      total: pending + processing + completed + failed + cancelled + dlq,
    };
  }

  /**
   * Get Prometheus metrics for monitoring
   */
  async getPrometheusMetrics(): Promise<{
    queueSize: number;
    dlqSize: number;
    retryRate: number;
    successRate: number;
  }> {
    const metrics = await this.getMetrics();
    const queueSize = metrics.pending + metrics.processing;
    const dlqSize = metrics.dlq;
    const totalAttempts = metrics.completed + metrics.failed + metrics.dlq;

    return {
      queueSize,
      dlqSize,
      retryRate: totalAttempts > 0 ? metrics.completed / totalAttempts : 0,
      successRate: metrics.completed > 0 ? 1 : 0,
    };
  }

  /**
   * Get retry history for a transaction with detailed information
   */
  async getRetryHistory(transactionId: number): Promise<
    Array<{
      attempt: number;
      status: TransactionRetryStatus;
      error?: string;
      timestamp: number;
      delayMs?: number;
    }>
  > {
    const retries = await this.getRetriesForTransaction(transactionId);
    const history: Array<{
      attempt: number;
      status: TransactionRetryStatus;
      error?: string;
      timestamp: number;
      delayMs?: number;
    }> = [];

    for (const retry of retries) {
      // Extract history from errorHistory or create from retry data
      if (retry.errorHistory) {
        for (const entry of retry.errorHistory) {
          history.push({
            attempt: entry.attempt,
            status: retry.status,
            error: entry.error,
            timestamp: entry.timestamp,
            delayMs: entry.delayMs,
          });
        }
      } else {
        // Fallback: single entry from the retry record
        history.push({
          attempt: retry.attemptCount || 0,
          status: retry.status,
          error: retry.lastError || undefined,
          timestamp: retry.createdAt,
        });
      }
    }

    return history.sort((a, b) => a.timestamp - b.timestamp);
  }
}
