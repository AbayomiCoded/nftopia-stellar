import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NftModule } from '../nft/nft.module';
import { ListingModule } from '../listing/listing.module';
import { CollectionModule } from '../collection/collection.module';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';
import { AiChatRateLimitGuard } from '../../common/guards/ai-chat-rate-limit.guard';
import { aiChatRateLimiterProvider } from '../../common/guards/ai-chat-rate-limiter.provider';

@Module({
  imports: [ConfigModule, NftModule, ListingModule, CollectionModule],
  providers: [AiAgentService, AiChatRateLimitGuard, aiChatRateLimiterProvider],
  controllers: [AiAgentController],
  exports: [AiAgentService],
})
export class AiAgentModule {}
