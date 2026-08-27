import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import { EmailLog, EmailStatus } from './entities/email-log.entity';
import { EMAIL_QUEUE_NAME } from './interfaces/email-job.interface';
import {
  SEND_EMAIL_JOB,
  type EmailJobData,
} from './interfaces/email-job.interface';
import { EMAIL_PROVIDER_TOKEN } from './email.constants';
import type { EmailProvider } from './interfaces/email-provider.interface';

/**
 * Consumes the `email` Bull queue and hands each job to the configured
 * EmailProvider. Retries are driven by the job's `attempts`/`backoff`
 * options (set when the job is enqueued in EmailService); this processor
 * only needs to throw on failure to trigger Bull's retry mechanism, and
 * keep the EmailLog row in sync with delivery status.
 */
@Injectable()
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly provider: EmailProvider,
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
  ) {}

  @Process(SEND_EMAIL_JOB)
  async handleSend(job: Job<EmailJobData>): Promise<void> {
    const { logId, to, subject, html, text, type } = job.data;

    try {
      const result = await this.provider.send({ to, subject, html, text });

      await this.emailLogRepo.update(logId, {
        status: EmailStatus.SENT,
        provider: result.provider,
        messageId: result.messageId ?? null,
        sentAt: new Date(),
        attempts: job.attemptsMade + 1,
        error: null,
      });

      this.logger.log(
        `Email sent: to=${to} type=${type} messageId=${result.messageId ?? 'n/a'}`,
      );
    } catch (err) {
      const attempts = job.attemptsMade + 1;
      const maxAttempts =
        typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
      const isFinalAttempt = attempts >= maxAttempts;
      const message = (err as Error).message;

      await this.emailLogRepo.update(logId, {
        attempts,
        error: message,
        status: isFinalAttempt ? EmailStatus.FAILED : EmailStatus.QUEUED,
      });

      this.logger.error(
        `Email send failed (attempt ${attempts}/${maxAttempts}): to=${to} type=${type} error=${message}`,
      );

      // Re-throw so Bull schedules the next retry per the job's backoff config.
      throw err;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job<EmailJobData>, err: Error): void {
    this.logger.error(
      `Email job ${job.id} permanently failed for to=${job.data.to} type=${job.data.type}: ${err.message}`,
    );
  }
}
