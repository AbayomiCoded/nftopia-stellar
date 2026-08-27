import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { EmailConfig } from '../email.config';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../interfaces/email-provider.interface';

/** Sends mail through any SMTP server (Gmail, Mailgun SMTP, self-hosted, ...). */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return { messageId: info.messageId, provider: this.name };
  }
}
