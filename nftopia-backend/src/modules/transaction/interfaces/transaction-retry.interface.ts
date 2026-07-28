/**
 * Interface definitions for transaction retry queue system
 * Provides type safety for retry job data, status tracking, and configuration
 */

/**
 * Represents the status of a transaction retry job
 */
export enum TransactionRetryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DLQ = 'dlq', // Dead Letter Queue
}

/**
 * Data payload for a transaction retry job
 * Stored in BullMQ queue and persisted to database
 */
export interface TransactionRetryJobData {
  /** Unique identifier for the retry attempt */
  retryId: string;

  /** ID of the transaction being retried */
  transactionId: number;

  /** Contract transaction ID from Stellar */
  contractTxId: string;

  /** Current retry attempt number (1-based) */
  attemptCount: number;

  /** Maximum allowed retry attempts */
  maxAttempts: number;

  /** Transaction XDR to submit */
  transactionXdr: string;

  /** Optional signature for submission */
  signature?: string;

  /** Error that caused the previous failure */
  lastError?: string;

  /** Timestamp when the job was created */
  createdAt: number;

  /** Timestamp when the job should be retried next */
  nextRetryAt: number;

  /** Custom metadata for the job */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;

  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number;

  /** Backoff multiplier (e.g., 2 for exponential) */
  backoffMultiplier: number;

  /** Whether to use jitter to prevent thundering herd */
  useJitter: boolean;
}

/**
 * Result of a retry attempt
 */
export interface RetryAttemptResult {
  /** Whether the retry was successful */
  success: boolean;

  /** Transaction hash if successful */
  txHash?: string;

  /** Error message if failed */
  error?: string;

  /** Whether the transaction should be moved to DLQ */
  moveToDlq: boolean;

  /** Suggested next retry delay in milliseconds */
  nextRetryDelayMs?: number;
}

/**
 * Transaction retry status response for API
 */
export interface TransactionRetryStatusResponse {
  retryId: string;
  transactionId: number;
  status: TransactionRetryStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: number;
  nextRetryAt?: number;
  completedAt?: number;
  txHash?: string;
}
