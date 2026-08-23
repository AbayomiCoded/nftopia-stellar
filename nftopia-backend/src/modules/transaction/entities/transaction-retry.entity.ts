import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionRetryStatus } from '../interfaces/transaction-retry.interface';

/**
 * Entity for tracking transaction retry attempts
 * Persists retry state to database for durability across application restarts
 */
@Entity('transaction_retries')
@Index('idx_transaction_retries_transaction_id', ['transactionId'])
@Index('idx_transaction_retries_status', ['status'])
@Index('idx_transaction_retries_next_retry_at', ['nextRetryAt'])
@Index('idx_transaction_retries_retry_id', ['retryId'], { unique: true })
export class TransactionRetry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  retryId: string;

  @Column({ type: 'int' })
  transactionId: number;

  @Column({ type: 'varchar', length: 64 })
  contractTxId: string;

  @Column({
    type: 'enum',
    enum: TransactionRetryStatus,
    default: TransactionRetryStatus.PENDING,
  })
  status: TransactionRetryStatus;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'int' })
  maxAttempts: number;

  @Column({ type: 'text', nullable: true })
  transactionXdr: string;

  @Column({ type: 'text', nullable: true })
  signature?: string;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'jsonb', nullable: true })
  errorHistory?: Array<{
    attempt: number;
    error: string;
    timestamp: number;
    delayMs?: number;
  }>;

  @Column({ type: 'bigint' })
  createdAt: number;

  @Column({ type: 'bigint', nullable: true })
  nextRetryAt?: number;

  @Column({ type: 'bigint', nullable: true })
  completedAt?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;
}
