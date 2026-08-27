import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiChatRateLimitGuard } from '../../common/guards/ai-chat-rate-limit.guard';

describe('AiAgentController', () => {
  const aiAgentService = {
    chat: jest.fn(),
  };

  const controller = new AiAgentController(
    aiAgentService as unknown as AiAgentService,
  );

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

  it('delegates to AiAgentService.chat and returns the reply', async () => {
    aiAgentService.chat.mockResolvedValue('Here are the top listings.');

    const result = await controller.chat({
      message: 'What NFTs are trending?',
    });

    expect(aiAgentService.chat).toHaveBeenCalledWith(
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

    await controller.chat({ message: 'Tell me more', history });

    expect(aiAgentService.chat).toHaveBeenCalledWith('Tell me more', history);
  });
});
