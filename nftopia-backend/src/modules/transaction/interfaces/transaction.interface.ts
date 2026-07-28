/**
 * Transaction interface definitions
 * Provides type safety for transaction-related operations
 */

import { Transaction } from '../entities/transaction.entity';
import { TransactionState } from '../enums/transaction-state.enum';

/**
 * Extended transaction interface with retry support
 * Used when a transaction has been enqueued for retry
 */
export interface TransactionWithRetry extends Transaction {
  /** Unique identifier for the retry attempt */
  retryId?: string;

  /** Current status of the retry attempt */
  retryStatus?:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'dlq';

  /** Number of retry attempts made */
  retryAttempts?: number;

  /** Timestamp of the next retry attempt */
  nextRetryAt?: number;

  /** Error that caused the transaction to be retried */
  retryError?: string;
}

/**
 * Transaction creation options
 */
export interface TransactionCreateOptions {
  /** Buyer user ID */
  buyerId: string;

  /** Seller user ID */
  sellerId: string;

  /** NFT contract ID */
  nftContractId: string;

  /** NFT token ID */
  nftTokenId: string;

  /** Transaction amount */
  amount: number;

  /** Currency code (e.g., 'XLM', 'USDC') */
  currency?: string;

  /** Optional listing ID */
  listingId?: string;

  /** Optional auction ID */
  auctionId?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Transaction execution options
 */
export interface TransactionExecutionOptions {
  /** Maximum gas to use */
  maxGas?: number;

  /** Additional configuration */
  config?: Record<string, unknown>;

  /** Whether to retry on failure */
  retryOnFailure?: boolean;
}

/**
 * Transaction status response
 */
export interface TransactionStatusResponse {
  /** Transaction ID */
  id: number;

  /** Contract transaction ID */
  contractTxId: string;

  /** Current state of the transaction */
  state: TransactionState;

  /** Contract state */
  contractState?: string;

  /** Error reason if failed */
  errorReason?: string;

  /** Retry information if available */
  retryInfo?: {
    retryId: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    nextRetryAt?: number;
  };
}

/**
 * Transaction filter options for queries
 */
export interface TransactionFilterOptions {
  /** Filter by state */
  state?: TransactionState;

  /** Filter by NFT ID */
  nftId?: string;

  /** Filter by date range */
  dateRange?: {
    start: number;
    end: number;
  };

  /** Filter by buyer ID */
  buyerId?: string;

  /** Filter by seller ID */
  sellerId?: string;

  /** Filter by retry status */
  hasRetries?: boolean;
}

/**
 * Transaction retry configuration
 */
export interface TransactionRetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Base delay in milliseconds */
  baseDelayMs: number;

  /** Maximum delay in milliseconds */
  maxDelayMs: number;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Whether to use jitter */
  useJitter: boolean;
}
