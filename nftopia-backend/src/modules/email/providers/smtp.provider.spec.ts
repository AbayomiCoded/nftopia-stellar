import * as nodemailer from 'nodemailer';
import { SmtpEmailProvider } from './smtp.provider';
import type { EmailConfig } from '../email.config';

jest.mock('nodemailer');

describe('SmtpEmailProvider', () => {
  const config: EmailConfig = {
    provider: 'smtp',
    fromAddress: 'noreply@nftopia.com',
    fromName: 'NFTopia',
    frontendUrl: 'https://nftopia.com',
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      user: 'u',
      pass: 'p',
      secure: false,
    },
    sendgrid: {},
    resend: {},
  };

  const sendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('creates a transport using the configured SMTP settings', () => {
    new SmtpEmailProvider(config);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'u', pass: 'p' },
      }),
    );
  });

  it('sends mail with the from name/address and returns the messageId', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg-123' });
    const provider = new SmtpEmailProvider(config);

    const result = await provider.send({
      to: 'user@nftopia.io',
      subject: 'Hello',
      html: '<p>hi</p>',
      text: 'hi',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"NFTopia" <noreply@nftopia.com>',
        to: 'user@nftopia.io',
        subject: 'Hello',
      }),
    );
    expect(result).toEqual({ messageId: 'msg-123', provider: 'smtp' });
  });

  it('omits auth when no SMTP user is configured', () => {
    new SmtpEmailProvider({
      ...config,
      smtp: { ...config.smtp, user: undefined, pass: undefined },
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: undefined }),
    );
  });
});
