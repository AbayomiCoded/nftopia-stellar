import { ForbiddenException } from '@nestjs/common';

// Anthropic() reads ANTHROPIC_API_KEY at construction time. Without one it
// kicks off an async credential-chain lookup (profile files, WIF env vars)
// that outlives the test — set a dummy key so the real request path (which
// every test mocks out anyway) never needs it.
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

import { AiAgentService } from './ai-agent.service';
import type { NftService } from '../nft/nft.service';
import type { ListingService } from '../listing/listing.service';
import type { CollectionService } from '../collection/collection.service';
import type { AiUsageService } from './ai-usage.service';

describe('AiAgentService', () => {
  let service: AiAgentService;

  const aiUsageService = {
    assertWithinCap: jest.fn(),
    recordUsage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiUsageService.assertWithinCap.mockResolvedValue(undefined);
    aiUsageService.recordUsage.mockResolvedValue(undefined);

    service = new AiAgentService(
      {} as NftService,
      {} as ListingService,
      {} as CollectionService,
      aiUsageService as unknown as AiUsageService,
    );
  });

  const mockToolRunner = (finalMessage: unknown) => {
    const client = (service as unknown as { client: unknown }).client as {
      beta: { messages: { toolRunner: jest.Mock } };
    };
    client.beta.messages.toolRunner = jest.fn().mockResolvedValue(finalMessage);
    return client.beta.messages.toolRunner;
  };

  const makeFinalMessage = (overrides: Record<string, unknown> = {}) => ({
    model: 'claude-opus-5',
    content: [{ type: 'text', text: 'Here are the top listings.' }],
    usage: { input_tokens: 500, output_tokens: 150 },
    ...overrides,
  });

  describe('cap enforcement', () => {
    it('rejects with ForbiddenException without calling the Anthropic API when the cap is reached', async () => {
      aiUsageService.assertWithinCap.mockRejectedValue(
        new ForbiddenException('Daily AI usage cap reached (200000 tokens).'),
      );
      const toolRunner = mockToolRunner(makeFinalMessage());

      await expect(
        service.chat('user-1', 'What NFTs are trending?'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(aiUsageService.assertWithinCap).toHaveBeenCalledWith('user-1');
      expect(toolRunner).not.toHaveBeenCalled();
      expect(aiUsageService.recordUsage).not.toHaveBeenCalled();
    });

    it('proceeds to call the Anthropic API when the caller is under their cap', async () => {
      const toolRunner = mockToolRunner(makeFinalMessage());

      const reply = await service.chat('user-1', 'What NFTs are trending?');

      expect(aiUsageService.assertWithinCap).toHaveBeenCalledWith('user-1');
      expect(toolRunner).toHaveBeenCalled();
      expect(reply).toBe('Here are the top listings.');
    });
  });

  describe('usage recording', () => {
    it('records usage from finalMessage.usage after a successful reply', async () => {
      mockToolRunner(
        makeFinalMessage({
          model: 'claude-opus-5',
          usage: { input_tokens: 1234, output_tokens: 567 },
        }),
      );

      await service.chat('user-42', 'Find me a rare NFT');

      expect(aiUsageService.recordUsage).toHaveBeenCalledWith(
        'user-42',
        'claude-opus-5',
        1234,
        567,
      );
    });

    it('does not record usage when the cap check throws', async () => {
      aiUsageService.assertWithinCap.mockRejectedValue(
        new ForbiddenException('cap reached'),
      );
      mockToolRunner(makeFinalMessage());

      await expect(service.chat('user-1', 'hi')).rejects.toThrow();

      expect(aiUsageService.recordUsage).not.toHaveBeenCalled();
    });

    it('does not block the reply on recordUsage resolving', async () => {
      let resolveRecord!: () => void;
      aiUsageService.recordUsage.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveRecord = resolve;
        }),
      );
      mockToolRunner(makeFinalMessage());

      const reply = await service.chat('user-1', 'hi');

      expect(reply).toBe('Here are the top listings.');
      // recordUsage's promise is still pending — proves chat() didn't await it.
      resolveRecord();
    });

    it('returns the joined text content from the final message', async () => {
      mockToolRunner(
        makeFinalMessage({
          content: [
            { type: 'text', text: 'First line.' },
            { type: 'tool_use', id: 't1', name: 'search_nfts', input: {} },
            { type: 'text', text: 'Second line.' },
          ],
        }),
      );

      const reply = await service.chat('user-1', 'hi');

      expect(reply).toBe('First line.\nSecond line.');
    });
  });
});
