import type { EmailConfig } from '../email.config';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../interfaces/email-provider.interface';

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

/** Sends mail through the SendGrid v3 HTTP API. */
export class SendgridEmailProvider implements EmailProvider {
  readonly name = 'sendgrid';
  private readonly config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = this.config.sendgrid.apiKey;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }
    const from = this.config.sendgrid.from || this.config.fromAddress;

    const response = await fetch(SENDGRID_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: from, name: this.config.fromName },
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          { type: 'text/html', value: message.html },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SendGrid send failed (${response.status}): ${body}`);
    }

    const messageId = response.headers.get('x-message-id') ?? undefined;
    return { messageId, provider: this.name };
  }
}
