import { Module } from '@nestjs/common';
import { NftModule } from '../nft/nft.module';
import { ListingModule } from '../listing/listing.module';
import { CollectionModule } from '../collection/collection.module';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';

@Module({
  imports: [NftModule, ListingModule, CollectionModule],
  providers: [AiAgentService],
  controllers: [AiAgentController],
  exports: [AiAgentService],
})
export class AiAgentModule {}
