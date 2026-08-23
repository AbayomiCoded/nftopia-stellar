-- Add 2FA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_disabled_at TIMESTAMP;

-- Create index for faster 2FA queries
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(is_two_factor_enabled) WHERE is_two_factor_enabled = true;