/** A rendered email ready to be handed to a provider for delivery. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Result returned by a provider after a successful send. */
export interface EmailSendResult {
  messageId?: string;
  provider: string;
}

/**
 * Abstraction every email provider (SMTP, SendGrid, Resend, ...) implements.
 * Kept intentionally small so it can be mocked easily in tests.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
