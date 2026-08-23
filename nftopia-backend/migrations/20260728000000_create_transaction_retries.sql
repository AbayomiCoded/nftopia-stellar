-- Create transaction_retries table for persistent retry tracking
CREATE TABLE IF NOT EXISTS transaction_retries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retry_id UUID UNIQUE NOT NULL,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  contract_tx_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  transaction_xdr TEXT,
  signature TEXT,
  last_error TEXT,
  error_history JSONB,
  created_at BIGINT NOT NULL,
  next_retry_at BIGINT,
  completed_at BIGINT,
  metadata JSONB,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_transaction_retries_transaction_id ON transaction_retries(transaction_id);
CREATE INDEX idx_transaction_retries_status ON transaction_retries(status);
CREATE INDEX idx_transaction_retries_next_retry_at ON transaction_retries(next_retry_at);
CREATE INDEX idx_transaction_retries_created_at ON transaction_retries(created_at);
CREATE INDEX idx_transaction_retries_retry_id ON transaction_retries(retry_id);

-- Add PENDING_RETRY state to transactions enum
ALTER TYPE transaction_state_enum ADD VALUE IF NOT EXISTS 'pending_retry';