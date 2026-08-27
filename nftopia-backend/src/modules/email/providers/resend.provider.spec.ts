import { ResendEmailProvider } from './resend.provider';
import type { EmailConfig } from '../email.config';

describe('ResendEmailProvider', () => {
  let fetchMock: jest.Mock;

  const config: EmailConfig = {
    provider: 'resend',
    fromAddress: 'noreply@nftopia.com',
    fromName: 'NFTopia',
    frontendUrl: 'https://nftopia.com',
    smtp: { port: 587, secure: false },
    sendgrid: {},
    resend: { apiKey: 're-key', from: 'sender@nftopia.com' },
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

  it('throws when RESEND_API_KEY is not configured', async () => {
    const provider = new ResendEmailProvider({
      ...config,
      resend: { from: 'sender@nftopia.com' },
    });

    await expect(provider.send(message)).rejects.toThrow(
      'RESEND_API_KEY is not configured',
    );
  });

  it('posts to the Resend API with the expected payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-id-1' }),
    });

    const provider = new ResendEmailProvider(config);
    const result = await provider.send(message);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer re-key');
    expect(JSON.parse(options.body)).toMatchObject({
      from: 'NFTopia <sender@nftopia.com>',
      to: ['user@nftopia.io'],
    });

    expect(result).toEqual({ messageId: 'resend-id-1', provider: 'resend' });
  });

  it('throws with the response body when Resend rejects the request', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Invalid from address'),
    });

    const provider = new ResendEmailProvider(config);

    await expect(provider.send(message)).rejects.toThrow(
      'Resend send failed (422): Invalid from address',
    );
  });
});
