import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionRetryModule } from './transaction-retry.module';
import { StellarModule } from '../stellar/stellar.module';
import { ListingModule } from '../listing/listing.module';
import { AuctionModule } from '../auction/auction.module';
import { NftModule } from '../nft/nft.module';
import { StorageModule } from '../../storage/storage.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    TransactionRetryModule,
    StellarModule,
    ListingModule,
    AuctionModule,
    NftModule,
    StorageModule,
    UsersModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
