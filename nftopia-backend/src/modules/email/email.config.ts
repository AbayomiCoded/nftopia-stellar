export type EmailProviderName = 'smtp' | 'sendgrid' | 'resend';

export interface EmailConfig {
  provider: EmailProviderName;
  fromAddress: string;
  fromName: string;
  frontendUrl: string;
  smtp: {
    host?: string;
    port: number;
    user?: string;
    pass?: string;
    secure: boolean;
  };
  sendgrid: {
    apiKey?: string;
    from?: string;
  };
  resend: {
    apiKey?: string;
    from?: string;
  };
}

const VALID_PROVIDERS: ReadonlyArray<EmailProviderName> = [
  'smtp',
  'sendgrid',
  'resend',
];

function resolveProvider(value: string | undefined): EmailProviderName {
  if (value && VALID_PROVIDERS.includes(value as EmailProviderName)) {
    return value as EmailProviderName;
  }
  return 'smtp';
}

/** Reads email provider configuration from environment variables. */
export function getEmailConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmailConfig {
  return {
    provider: resolveProvider(env.EMAIL_PROVIDER),
    fromAddress: env.EMAIL_FROM_ADDRESS || 'noreply@nftopia.com',
    fromName: env.EMAIL_FROM_NAME || 'NFTopia',
    frontendUrl: (env.FRONTEND_URL || 'http://localhost:3001').replace(
      /\/+$/,
      '',
    ),
    smtp: {
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT || '587', 10),
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      secure: env.SMTP_SECURE === 'true',
    },
    sendgrid: {
      apiKey: env.SENDGRID_API_KEY,
      from: env.SENDGRID_FROM,
    },
    resend: {
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM,
    },
  };
}
