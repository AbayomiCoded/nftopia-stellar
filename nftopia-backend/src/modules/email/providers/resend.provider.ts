import type { EmailConfig } from '../email.config';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../interfaces/email-provider.interface';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Sends mail through the Resend HTTP API. */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = this.config.resend.apiKey;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    const from = this.config.resend.from || this.config.fromAddress;

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.config.fromName} <${from}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend send failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { id?: string };
    return { messageId: data.id, provider: this.name };
  }
}
