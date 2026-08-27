import { createEmailProvider } from './provider.factory';
import { SmtpEmailProvider } from './smtp.provider';
import { SendgridEmailProvider } from './sendgrid.provider';
import { ResendEmailProvider } from './resend.provider';
import { getEmailConfig } from '../email.config';

describe('createEmailProvider', () => {
  const baseConfig = getEmailConfig({});

  it('returns an SmtpEmailProvider for provider "smtp"', () => {
    const provider = createEmailProvider({ ...baseConfig, provider: 'smtp' });
    expect(provider).toBeInstanceOf(SmtpEmailProvider);
  });

  it('returns a SendgridEmailProvider for provider "sendgrid"', () => {
    const provider = createEmailProvider({
      ...baseConfig,
      provider: 'sendgrid',
    });
    expect(provider).toBeInstanceOf(SendgridEmailProvider);
  });

  it('returns a ResendEmailProvider for provider "resend"', () => {
    const provider = createEmailProvider({
      ...baseConfig,
      provider: 'resend',
    });
    expect(provider).toBeInstanceOf(ResendEmailProvider);
  });
});

describe('getEmailConfig', () => {
  it('defaults to the smtp provider when EMAIL_PROVIDER is unset', () => {
    const config = getEmailConfig({});
    expect(config.provider).toBe('smtp');
  });

  it('falls back to smtp for an unrecognized provider value', () => {
    const config = getEmailConfig({
      EMAIL_PROVIDER: 'mailgun',
    });
    expect(config.provider).toBe('smtp');
  });

  it('reads provider-specific credentials from the environment', () => {
    const config = getEmailConfig({
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'key-1',
      RESEND_FROM: 'hello@nftopia.com',
      FRONTEND_URL: 'https://app.nftopia.com/',
    });

    expect(config.provider).toBe('resend');
    expect(config.resend.apiKey).toBe('key-1');
    expect(config.resend.from).toBe('hello@nftopia.com');
    // trailing slash is stripped
    expect(config.frontendUrl).toBe('https://app.nftopia.com');
  });
});
