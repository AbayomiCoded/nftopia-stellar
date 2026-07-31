/**
 * Interface for 2FA service configuration
 */
export interface TwoFactorConfig {
  /** TOTP code length (default: 6) */
  codeLength: number;

  /** TOTP window for validation (default: 1) */
  window: number;

  /** TOTP time step in seconds (default: 30) */
  timeStep: number;

  /** Issuer name for authenticator app */
  issuer: string;

  /** Algorithm for TOTP (default: 'sha1') */
  algorithm: 'sha1' | 'sha256' | 'sha512';

  /** Encoding for secret (default: 'base32') */
  encoding: 'base32' | 'base64' | 'hex';

  /** Number of backup codes to generate (default: 10) */
  backupCodeCount: number;

  /** Length of each backup code (default: 16) */
  backupCodeLength: number;
}

/**
 * Interface for 2FA session data stored in Redis
 */
export interface TwoFactorSessionData {
  /** User ID */
  userId: string;

  /** Temporary token issued after initial auth */
  tempToken: string;

  /** Whether the user has 2FA enabled */
  twoFactorEnabled: boolean;

  /** When the session was created */
  createdAt: number;

  /** Session expiry timestamp */
  expiresAt: number;
}

/**
 * Interface for 2FA verification result
 */
export interface TwoFactorVerificationResult {
  /** Whether verification was successful */
  verified: boolean;

  /** User ID if verified */
  userId?: string;

  /** Error message if verification failed */
  error?: string;

  /** Whether a backup code was used */
  usedBackupCode?: boolean;

  /** Remaining backup codes count */
  remainingBackupCodes?: number;
}

/**
 * Interface for 2FA audit log entry
 */
export interface TwoFactorAuditLog {
  /** User ID */
  userId: string;

  /** Action performed */
  action:
    | 'enable'
    | 'disable'
    | 'verify'
    | 'recovery'
    | 'regenerate'
    | 'failed_attempt';

  /** Whether the action was successful */
  success: boolean;

  /** Timestamp of the action */
  timestamp: Date;

  /** IP address of the request */
  ipAddress?: string;

  /** User agent of the request */
  userAgent?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
