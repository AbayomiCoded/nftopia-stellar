import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiChatRateLimitGuard } from '../../common/guards/ai-chat-rate-limit.guard';
import { AiAgentService } from './ai-agent.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  // JwtAuthGuard (controller-scoped) runs before this route-scoped guard,
  // so req.user.userId is populated by the time AiChatRateLimitGuard keys
  // the per-user limiter.
  @UseGuards(AiChatRateLimitGuard)
  @Post('chat')
  async chat(@Body() dto: ChatRequestDto): Promise<{ reply: string }> {
    const reply = await this.aiAgentService.chat(dto.message, dto.history);
    return { reply };
  }
}
