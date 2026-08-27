import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLog } from './entities/email-log.entity';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailTemplateService } from './template.service';
import { EmailRateLimitGuard } from './email-rate-limit.guard';
import { EMAIL_PROVIDER_TOKEN } from './email.constants';
import { EMAIL_QUEUE_NAME } from './interfaces/email-job.interface';
import { createEmailProvider } from './providers/provider.factory';
import { getEmailConfig } from './email.config';

/**
 * Transactional email module: renders Handlebars templates, queues sends
 * through Bull for async delivery + retries, and tracks status in
 * `email_logs`. Import this into any feature module that needs to send
 * verification, password-reset, bid, or auction-won emails.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailLog]),
    BullModule.registerQueue({ name: EMAIL_QUEUE_NAME }),
  ],
  providers: [
    EmailService,
    EmailProcessor,
    EmailTemplateService,
    EmailRateLimitGuard,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: () => createEmailProvider(getEmailConfig(process.env)),
    },
  ],
  exports: [EmailService, EmailRateLimitGuard],
})
export class EmailModule {}
