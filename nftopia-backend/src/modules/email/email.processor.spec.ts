import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailProcessor } from './email.processor';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { EMAIL_PROVIDER_TOKEN } from './email.constants';
import type { EmailJobData } from './interfaces/email-job.interface';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;

  const provider = {
    name: 'smtp',
    send: jest.fn(),
  };

  const emailLogRepo = {
    update: jest.fn(),
  };

  const makeJob = (
    overrides: Partial<EmailJobData> = {},
    attemptsMade = 0,
    attempts = 5,
  ): Job<EmailJobData> =>
    ({
      id: 'job-1',
      data: {
        logId: 'log-1',
        to: 'user@nftopia.io',
        subject: 'Subject',
        html: '<p>hi</p>',
        text: 'hi',
        type: 'verification',
        ...overrides,
      },
      attemptsMade,
      opts: { attempts },
    }) as unknown as Job<EmailJobData>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: EMAIL_PROVIDER_TOKEN, useValue: provider },
        { provide: getRepositoryToken(EmailLog), useValue: emailLogRepo },
      ],
    }).compile();

    processor = moduleRef.get(EmailProcessor);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('marks the log SENT and stores the messageId on success', async () => {
    provider.send.mockResolvedValue({ messageId: 'msg-1', provider: 'smtp' });

    await processor.handleSend(makeJob());

    expect(emailLogRepo.update).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        status: EmailStatus.SENT,
        messageId: 'msg-1',
        provider: 'smtp',
      }),
    );
  });

  it('keeps status QUEUED and rethrows when attempts remain', async () => {
    provider.send.mockRejectedValue(new Error('smtp timeout'));

    await expect(processor.handleSend(makeJob({}, 0, 5))).rejects.toThrow(
      'smtp timeout',
    );

    expect(emailLogRepo.update).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        status: EmailStatus.QUEUED,
        attempts: 1,
        error: 'smtp timeout',
      }),
    );
  });

  it('marks the log FAILED once the final attempt is exhausted', async () => {
    provider.send.mockRejectedValue(new Error('smtp timeout'));

    await expect(processor.handleSend(makeJob({}, 4, 5))).rejects.toThrow(
      'smtp timeout',
    );

    expect(emailLogRepo.update).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        status: EmailStatus.FAILED,
        attempts: 5,
      }),
    );
  });

  it('passes the rendered message through to the provider unchanged', async () => {
    provider.send.mockResolvedValue({ messageId: 'msg-2', provider: 'smtp' });

    await processor.handleSend(
      makeJob({
        to: 'x@y.com',
        subject: 'Hello',
        html: '<h1>hi</h1>',
        text: 'hi',
      }),
    );

    expect(provider.send).toHaveBeenCalledWith({
      to: 'x@y.com',
      subject: 'Hello',
      html: '<h1>hi</h1>',
      text: 'hi',
    });
  });
});
