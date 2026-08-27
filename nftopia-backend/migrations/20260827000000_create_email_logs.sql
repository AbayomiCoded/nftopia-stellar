CREATE TYPE email_logs_type_enum AS ENUM (
  'verification',
  'password_reset',
  'bid_notification',
  'auction_won'
);

CREATE TYPE email_logs_status_enum AS ENUM (
  'queued',
  'sent',
  'failed'
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "to" VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  type email_logs_type_enum NOT NULL,
  status email_logs_status_enum NOT NULL DEFAULT 'queued',
  provider VARCHAR(50),
  message_id VARCHAR(255),
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs ("to");
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs (type);
