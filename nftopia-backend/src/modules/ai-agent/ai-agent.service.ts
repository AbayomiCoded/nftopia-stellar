import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages';
import { NftService } from '../nft/nft.service';
import { ListingService } from '../listing/listing.service';
import { CollectionService } from '../collection/collection.service';
import { buildMarketplaceTools } from './tools/marketplace.tools';
import { ChatTurnDto } from './dto/chat-request.dto';

const SYSTEM_PROMPT = `You are the NFTopia marketplace assistant. You help users find NFTs, \
listings, and collections on the NFTopia Stellar marketplace using the tools available to you. \
Only state facts returned by your tools — never invent prices, ownership, or availability. \
If a search returns no results, say so plainly instead of guessing. Keep answers concise.`;

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private readonly client = new Anthropic();

  constructor(
    private readonly nftService: NftService,
    private readonly listingService: ListingService,
    private readonly collectionService: CollectionService,
  ) {}

  async chat(message: string, history: ChatTurnDto[] = []): Promise<string> {
    const tools = buildMarketplaceTools({
      nftService: this.nftService,
      listingService: this.listingService,
      collectionService: this.collectionService,
    });

    const messages: BetaMessageParam[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: message },
    ];

    try {
      const finalMessage = await this.client.beta.messages.toolRunner({
        model: 'claude-opus-5',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      const textBlocks = finalMessage.content.filter(
        (block): block is Extract<typeof block, { type: 'text' }> =>
          block.type === 'text',
      );
      return textBlocks
        .map((block) => block.text)
        .join('\n')
        .trim();
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        this.logger.warn('Anthropic rate limit hit');
        throw new ServiceUnavailableException(
          'AI assistant is busy, please try again shortly',
        );
      }
      if (error instanceof Anthropic.AuthenticationError) {
        this.logger.error(
          'Anthropic authentication failed — check ANTHROPIC_API_KEY',
        );
        throw new InternalServerErrorException('AI assistant is misconfigured');
      }
      if (error instanceof Anthropic.APIError) {
        this.logger.error(`Anthropic API error: ${error.message}`);
        throw new ServiceUnavailableException(
          'AI assistant is temporarily unavailable',
        );
      }
      this.logger.error('Unexpected error in AI assistant', error as Error);
      throw new InternalServerErrorException('AI assistant failed to respond');
    }
  }
}
