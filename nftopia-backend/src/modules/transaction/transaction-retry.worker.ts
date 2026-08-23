import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueStalled,
} from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { TransactionRetryQueueService } from './transaction-retry-queue.service';
import {
  TransactionRetryJobData,
  TransactionRetryStatus,
} from './interfaces/transaction-retry.interface';
import { SorobanService } from '../stellar/soroban.service';
import { TransactionState } from './enums/transaction-state.enum';

/**
 * Worker processor for transaction retry jobs
 * Consumes jobs from the Bull queue and handles the retry logic
 */
@Processor('transaction-retry')
@Injectable()
export class TransactionRetryWorker {
  private readonly logger = new Logger(TransactionRetryWorker.name);

  constructor(
    private readonly retryQueueService: TransactionRetryQueueService,
    private readonly sorobanService: SorobanService,
  ) {}

  /**
   * Process a retry job from the queue
   */
  @Process('retry-transaction')
  async process(job: Job<TransactionRetryJobData>): Promise<void> {
    this.logger.debug(
      `Processing retry job ${job.id} for transaction ${job.data.transactionId}`,
    );

    const { retryId, transactionXdr, signature } = job.data;

    try {
      // Submit the transaction via SorobanService
      const result = await this.sorobanService.submitTransaction(
        { transactionXdr, simulationResult: null },
        signature,
      );

      // Success - mark as completed
      const retryRecord = await this.retryQueueService['retryRepo'].findOne({
        where: { retryId },
      });

      if (retryRecord) {
        retryRecord.status = TransactionRetryStatus.COMPLETED;
        retryRecord.completedAt = Date.now();
        await this.retryQueueService['retryRepo'].save(retryRecord);

        // Update the original transaction
        await this.retryQueueService['transactionRepo'].update(
          retryRecord.transactionId,
          {
            state: TransactionState.COMPLETED,
            contractState: 'completed',
            completedAt: Date.now(),
            metadata: {
              ...(retryRecord.metadata || {}),
              retryTxHash: result.hash,
              retryCompletedAt: new Date().toISOString(),
            },
          },
        );
      }

      this.logger.log(
        `Retry ${retryId} completed successfully with hash ${result.hash}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Retry ${retryId} failed: ${errorMessage}`);

      // Handle the failure through the queue service
      const retryRecord = await this.retryQueueService['retryRepo'].findOne({
        where: { retryId },
      });

      if (!retryRecord) {
        throw new Error(`Retry record ${retryId} not found`);
      }

      // Check if we should retry or move to DLQ
      const nextAttempt = retryRecord.attemptCount + 1;

      if (nextAttempt > retryRecord.maxAttempts) {
        // Move to DLQ
        await this.retryQueueService['moveToDlq'](retryRecord);
        this.logger.warn(
          `Retry ${retryId} moved to DLQ after ${retryRecord.attemptCount} attempts`,
        );
        return;
      }

      // Calculate next delay and re-enqueue
      const nextDelay =
        this.retryQueueService['calculateRetryDelay'](nextAttempt);
      retryRecord.status = TransactionRetryStatus.PENDING;
      retryRecord.attemptCount = nextAttempt;
      retryRecord.lastError = errorMessage;
      retryRecord.nextRetryAt = Date.now() + nextDelay;

      const errorHistory = retryRecord.errorHistory || [];
      errorHistory.push({
        attempt: nextAttempt,
        error: errorMessage,
        timestamp: Date.now(),
        delayMs: nextDelay,
      });
      retryRecord.errorHistory = errorHistory;

      await this.retryQueueService['retryRepo'].save(retryRecord);

      // Re-add to queue with delay
      await this.retryQueueService['retryQueue'].add(
        'retry-transaction',
        {
          retryId: retryRecord.retryId,
          transactionId: retryRecord.transactionId,
          contractTxId: retryRecord.contractTxId,
          attemptCount: nextAttempt,
          maxAttempts: retryRecord.maxAttempts,
          transactionXdr: retryRecord.transactionXdr,
          signature: retryRecord.signature,
          lastError: errorMessage,
          createdAt: retryRecord.createdAt,
          nextRetryAt: retryRecord.nextRetryAt || 0,
          metadata: retryRecord.metadata,
        },
        {
          jobId: retryId,
          delay: nextDelay,
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.warn(
        `Retry ${retryId} re-enqueued for attempt ${nextAttempt} with delay ${nextDelay}ms`,
      );
    }
  }

  /**
   * Event handler for when a job completes
   */
  @OnQueueCompleted()
  onCompleted(job: Job<TransactionRetryJobData>) {
    this.logger.debug(
      `Job ${job.id} completed for transaction ${job.data.transactionId}`,
    );
  }

  /**
   * Event handler for when a job fails
   */
  @OnQueueFailed()
  onFailed(job: Job<TransactionRetryJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for transaction ${job.data.transactionId}: ${error.message}`,
    );
  }

  /**
   * Event handler for when a job is stuck
   */
  @OnQueueStalled()
  onStalled(job: Job<TransactionRetryJobData>) {
    this.logger.warn(
      `Job ${job.id} stalled for transaction ${job.data.transactionId}. This job may need investigation.`,
    );
  }
}
