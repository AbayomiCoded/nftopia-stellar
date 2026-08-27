import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  SSE_METADATA,
} from '@nestjs/common/constants';
import { of } from 'rxjs';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiUsageService } from './ai-usage.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiChatRateLimitGuard } from '../../common/guards/ai-chat-rate-limit.guard';

describe('AiAgentController', () => {
  const aiAgentService = {
    chat: jest.fn(),
    chatStream: jest.fn(),
  };

  const aiUsageService = {
    getUsageSummary: jest.fn(),
  };

  const controller = new AiAgentController(
    aiAgentService as unknown as AiAgentService,
    aiUsageService as unknown as AiUsageService,
  );

  const makeRequest = (userId?: string) =>
    ({ user: userId ? { userId } : undefined }) as unknown as Parameters<
      typeof controller.chat
    >[0];

  afterEach(() => jest.clearAllMocks());

  it('applies JwtAuthGuard at the controller level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AiAgentController) as
      | unknown[]
      | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('applies AiChatRateLimitGuard to the chat route', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller.chat) as
      | unknown[]
      | undefined;

    expect(guards).toContain(AiChatRateLimitGuard);
  });

  describe('chat', () => {
    it('delegates to AiAgentService.chat with the authenticated user id and returns the reply', async () => {
      aiAgentService.chat.mockResolvedValue('Here are the top listings.');

      const result = await controller.chat(makeRequest('user-1'), {
        message: 'What NFTs are trending?',
      });

      expect(aiAgentService.chat).toHaveBeenCalledWith(
        'user-1',
        'What NFTs are trending?',
        undefined,
      );
      expect(result).toEqual({ reply: 'Here are the top listings.' });
    });

    it('forwards conversation history to AiAgentService.chat', async () => {
      aiAgentService.chat.mockResolvedValue('Sure, here is more detail.');
      const history = [
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello, how can I help?' },
      ];

      await controller.chat(makeRequest('user-1'), {
        message: 'Tell me more',
        history,
      });

      expect(aiAgentService.chat).toHaveBeenCalledWith(
        'user-1',
        'Tell me more',
        history,
      );
    });

    it('rejects with UnauthorizedException when no authenticated user is present', async () => {
      await expect(
        controller.chat(makeRequest(undefined), { message: 'hi' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(aiAgentService.chat).not.toHaveBeenCalled();
    });
  });

  describe('chatStream', () => {
    it('is registered as an SSE route on POST chat/stream', () => {
      expect(Reflect.getMetadata(SSE_METADATA, controller.chatStream)).toBe(
        true,
      );
      expect(Reflect.getMetadata(PATH_METADATA, controller.chatStream)).toBe(
        'chat/stream',
      );
      expect(Reflect.getMetadata(METHOD_METADATA, controller.chatStream)).toBe(
        RequestMethod.POST,
      );
    });

    it('applies AiChatRateLimitGuard to the stream route', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        controller.chatStream,
      ) as unknown[] | undefined;

      expect(guards).toContain(AiChatRateLimitGuard);
    });

    it('delegates to AiAgentService.chatStream with the authenticated user id', () => {
      const observable = of();
      aiAgentService.chatStream.mockReturnValue(observable);

      const result = controller.chatStream(makeRequest('user-1'), {
        message: 'What NFTs are trending?',
      });

      expect(aiAgentService.chatStream).toHaveBeenCalledWith(
        'user-1',
        'What NFTs are trending?',
        undefined,
      );
      expect(result).toBe(observable);
    });

    it('forwards conversation history to AiAgentService.chatStream', () => {
      aiAgentService.chatStream.mockReturnValue(of());
      const history = [{ role: 'user' as const, content: 'Hi' }];

      controller.chatStream(makeRequest('user-1'), {
        message: 'Tell me more',
        history,
      });

      expect(aiAgentService.chatStream).toHaveBeenCalledWith(
        'user-1',
        'Tell me more',
        history,
      );
    });

    it('throws UnauthorizedException when no authenticated user is present', () => {
      expect(() =>
        controller.chatStream(makeRequest(undefined), { message: 'hi' }),
      ).toThrow(UnauthorizedException);
      expect(aiAgentService.chatStream).not.toHaveBeenCalled();
    });
  });

  describe('getUsage', () => {
    it('returns the authenticated user usage summary', async () => {
      const summary = {
        daily: {
          totalTokens: 100,
          estimatedCostUsd: 0.5,
          cap: 1000,
          remaining: 900,
        },
        monthly: {
          totalTokens: 100,
          estimatedCostUsd: 0.5,
          cap: 10000,
          remaining: 9900,
        },
      };
      aiUsageService.getUsageSummary.mockResolvedValue(summary);

      const result = await controller.getUsage(makeRequest('user-1'));

      expect(aiUsageService.getUsageSummary).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(summary);
    });

    it('rejects with UnauthorizedException when no authenticated user is present', async () => {
      await expect(
        controller.getUsage(makeRequest(undefined)),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(aiUsageService.getUsageSummary).not.toHaveBeenCalled();
    });
  });
});
