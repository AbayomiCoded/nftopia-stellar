export enum TransactionState {
  DRAFT = 'draft',
  PENDING = 'pending',
  PENDING_RETRY = 'pending_retry',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ROLLED_BACK = 'rolled_back',
}
