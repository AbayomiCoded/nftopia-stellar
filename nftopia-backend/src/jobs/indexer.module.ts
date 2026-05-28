import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexerService } from './indexer.service';
import { ContractEventIndexerJob } from './contract-event-indexer.job';
import { SystemSettings } from './system-settings.entity';
import { ContractEvent } from './entities/contract-event.entity';
import { StellarNft } from '../nft/entities/stellar-nft.entity';
import { StellarModule } from '../modules/stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSettings, StellarNft, ContractEvent]),
    StellarModule,
  ],
  providers: [IndexerService, ContractEventIndexerJob],
  exports: [IndexerService, ContractEventIndexerJob],
})
export class IndexerModule {}
