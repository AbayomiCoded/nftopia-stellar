import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionRetry } from './entities/transaction-retry.entity';
import { TransactionRetryQueueService } from './transaction-retry-queue.service';
import { TransactionRetryWorker } from './transaction-retry.worker';
import { TransactionRetryController } from './transaction-retry.controller';
import { Transaction } from './entities/transaction.entity';
import { StellarModule } from '../stellar/stellar.module';

/**
 * Module for transaction retry functionality
 * Provides persistent queue-based retry for blockchain transactions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionRetry, Transaction]),
    BullModule.registerQueue({
      name: 'transaction-retry',
      defaultJobOptions: {
        attempts: 1, // We handle retries ourselves
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),
    StellarModule,
  ],
  controllers: [TransactionRetryController],
  providers: [TransactionRetryQueueService, TransactionRetryWorker],
  exports: [TransactionRetryQueueService],
})
export class TransactionRetryModule {}
