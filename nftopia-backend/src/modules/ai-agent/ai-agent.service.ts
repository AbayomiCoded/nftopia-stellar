import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaMessage,
  BetaMessageParam,
} from '@anthropic-ai/sdk/resources/beta/messages';
import { NftService } from '../nft/nft.service';
import { ListingService } from '../listing/listing.service';
import { CollectionService } from '../collection/collection.service';
import { resolveToolSet } from './tools/tool-set.registry';
import type { ToolSetName } from './tools/tool-set.types';
import { ChatTurnDto } from './dto/chat-request.dto';
import { AiUsageService } from './ai-usage.service';

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
    private readonly aiUsageService: AiUsageService,
  ) {}

  async chat(
    userId: string,
    toolSet: ToolSetName,
    message: string,
    history: ChatTurnDto[] = [],
  ): Promise<string> {
    await this.aiUsageService.assertWithinCap(userId);

    const tools = resolveToolSet(toolSet, {
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

      // Fire-and-forget: recordUsage never throws, and the reply must not
      // wait on the write. finalMessage.usage reflects the final turn of
      // the tool-calling loop (the Anthropic SDK does not expose a
      // pre-summed cross-iteration total on the tool runner's result).
      void this.aiUsageService.recordUsage(
        userId,
        finalMessage.model,
        finalMessage.usage.input_tokens,
        finalMessage.usage.output_tokens,
      );

      const textBlocks = finalMessage.content.filter(
        (block): block is Extract<typeof block, { type: 'text' }> =>
          block.type === 'text',
      );
      return textBlocks
        .map((block) => block.text)
        .join('\n')
        .trim();
    } catch (error) {
      throw this.mapAnthropicError(error);
    }
  }

  /**
   * Streaming variant of chat(). Emits `text` deltas as they're generated,
   * a `tool_call` event whenever the model starts a tool_use block, and a
   * terminal `done` event with the full assembled reply. A mid-stream
   * `pause_turn` (long-running server-tool turns) is resumed transparently
   * by pushing the paused assistant turn back into the runner, per the
   * Anthropic SDK's documented streaming pause/resume pattern — the caller
   * never sees a truncated answer.
   *
   * Errors are delivered via the Observable's error channel. NestJS's SSE
   * response controller emits a terminal `error` SSE event for them once
   * streaming has started, or a normal HTTP error response if none of the
   * stream has been written yet (e.g. a cap-exceeded rejection).
   */
  chatStream(
    userId: string,
    toolSet: ToolSetName,
    message: string,
    history: ChatTurnDto[] = [],
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let unsubscribed = false;

      void (async () => {
        try {
          await this.aiUsageService.assertWithinCap(userId);

          const tools = resolveToolSet(toolSet, {
            nftService: this.nftService,
            listingService: this.listingService,
            collectionService: this.collectionService,
          });

          const messages: BetaMessageParam[] = [
            ...history.map((turn) => ({
              role: turn.role,
              content: turn.content,
            })),
            { role: 'user', content: message },
          ];

          const runner = this.client.beta.messages.toolRunner({
            model: 'claude-opus-5',
            max_tokens: 64000,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'medium' },
            system: SYSTEM_PROMPT,
            tools,
            messages,
            stream: true,
          });

          const replyParts: string[] = [];
          let lastMessage: BetaMessage | null = null;

          for await (const stream of runner) {
            if (unsubscribed) return;

            for await (const event of stream) {
              if (unsubscribed) return;

              if (
                event.type === 'content_block_start' &&
                event.content_block.type === 'tool_use'
              ) {
                subscriber.next({
                  type: 'tool_call',
                  data: {
                    id: event.content_block.id,
                    name: event.content_block.name,
                  },
                });
              } else if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                replyParts.push(event.delta.text);
                subscriber.next({
                  type: 'text',
                  data: { text: event.delta.text },
                });
              }
            }

            lastMessage = await stream.finalMessage();
            if (lastMessage.stop_reason === 'pause_turn') {
              runner.pushMessages({
                role: 'assistant',
                content: lastMessage.content,
              });
            }
          }

          const finalMessage = lastMessage ?? (await runner.done());

          // Fire-and-forget, same contract as chat(): never blocks the
          // stream and never throws (see AiUsageService.recordUsage).
          void this.aiUsageService.recordUsage(
            userId,
            finalMessage.model,
            finalMessage.usage.input_tokens,
            finalMessage.usage.output_tokens,
          );

          subscriber.next({
            type: 'done',
            data: { reply: replyParts.join('').trim() },
          });
          subscriber.complete();
        } catch (error) {
          subscriber.error(this.mapAnthropicError(error));
        }
      })();

      return () => {
        unsubscribed = true;
      };
    });
  }

  private mapAnthropicError(error: unknown): Error {
    if (error instanceof ForbiddenException) {
      // Cap-exceeded, already a clear typed/user-facing error — pass through.
      return error;
    }
    if (error instanceof Anthropic.RateLimitError) {
      this.logger.warn('Anthropic rate limit hit');
      return new ServiceUnavailableException(
        'AI assistant is busy, please try again shortly',
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      this.logger.error(
        'Anthropic authentication failed — check ANTHROPIC_API_KEY',
      );
      return new InternalServerErrorException('AI assistant is misconfigured');
    }
    if (error instanceof Anthropic.APIError) {
      this.logger.error(`Anthropic API error: ${error.message}`);
      return new ServiceUnavailableException(
        'AI assistant is temporarily unavailable',
      );
    }
    this.logger.error('Unexpected error in AI assistant', error as Error);
    return new InternalServerErrorException('AI assistant failed to respond');
  }
}
