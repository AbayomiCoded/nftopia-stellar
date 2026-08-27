import type { EmailConfig } from '../email.config';
import type { EmailProvider } from '../interfaces/email-provider.interface';
import { SmtpEmailProvider } from './smtp.provider';
import { SendgridEmailProvider } from './sendgrid.provider';
import { ResendEmailProvider } from './resend.provider';

/** Builds the configured EmailProvider implementation from EMAIL_PROVIDER. */
export function createEmailProvider(config: EmailConfig): EmailProvider {
  switch (config.provider) {
    case 'sendgrid':
      return new SendgridEmailProvider(config);
    case 'resend':
      return new ResendEmailProvider(config);
    case 'smtp':
    default:
      return new SmtpEmailProvider(config);
  }
}
