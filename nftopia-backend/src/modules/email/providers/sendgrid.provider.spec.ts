import { SendgridEmailProvider } from './sendgrid.provider';
import type { EmailConfig } from '../email.config';

describe('SendgridEmailProvider', () => {
  let fetchMock: jest.Mock;

  const config: EmailConfig = {
    provider: 'sendgrid',
    fromAddress: 'noreply@nftopia.com',
    fromName: 'NFTopia',
    frontendUrl: 'https://nftopia.com',
    smtp: { port: 587, secure: false },
    sendgrid: { apiKey: 'sg-key', from: 'sender@nftopia.com' },
    resend: {},
  };

  const message = {
    to: 'user@nftopia.io',
    subject: 'Hello',
    html: '<p>hi</p>',
    text: 'hi',
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  it('throws when SENDGRID_API_KEY is not configured', async () => {
    const provider = new SendgridEmailProvider({
      ...config,
      sendgrid: { from: 'sender@nftopia.com' },
    });

    await expect(provider.send(message)).rejects.toThrow(
      'SENDGRID_API_KEY is not configured',
    );
  });

  it('posts to the SendGrid API with the expected payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'sg-message-id' },
    });

    const provider = new SendgridEmailProvider(config);
    const result = await provider.send(message);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer sg-key');
    expect(JSON.parse(options.body)).toMatchObject({
      personalizations: [{ to: [{ email: 'user@nftopia.io' }] }],
      from: { email: 'sender@nftopia.com' },
    });

    expect(result).toEqual({
      messageId: 'sg-message-id',
      provider: 'sendgrid',
    });
  });

  it('throws with the response body when SendGrid rejects the request', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    const provider = new SendgridEmailProvider(config);

    await expect(provider.send(message)).rejects.toThrow(
      'SendGrid send failed (401): Unauthorized',
    );
  });
});
