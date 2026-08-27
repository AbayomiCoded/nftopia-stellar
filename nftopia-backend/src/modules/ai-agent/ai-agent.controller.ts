import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  RequestMethod,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import type { Observable } from 'rxjs';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiChatRateLimitGuard } from '../../common/guards/ai-chat-rate-limit.guard';
import { AiAgentService } from './ai-agent.service';
import { AiUsageService, type UsageSummary } from './ai-usage.service';
import { ChatRequestDto } from './dto/chat-request.dto';

type RequestWithUser = Request & { user?: { userId: string } };

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiAgentController {
  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  // JwtAuthGuard (controller-scoped) runs before this route-scoped guard,
  // so req.user.userId is populated by the time AiChatRateLimitGuard keys
  // the per-user limiter.
  @UseGuards(AiChatRateLimitGuard)
  @Post('chat')
  async chat(
    @Req() req: RequestWithUser,
    @Body() dto: ChatRequestDto,
  ): Promise<{ reply: string }> {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    const reply = await this.aiAgentService.chat(
      req.user.userId,
      dto.message,
      dto.history,
    );
    return { reply };
  }

  // @Sse defaults to GET; override the method metadata to POST so the
  // request body (message + history) can be sent the same way as /ai/chat.
  // Same rate-limit bucket as /ai/chat — both hit the same Anthropic spend.
  @UseGuards(AiChatRateLimitGuard)
  @Sse('chat/stream', { [METHOD_METADATA]: RequestMethod.POST })
  chatStream(
    @Req() req: RequestWithUser,
    @Body() dto: ChatRequestDto,
  ): Observable<MessageEvent> {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    return this.aiAgentService.chatStream(
      req.user.userId,
      dto.message,
      dto.history,
    );
  }

  @Get('usage')
  async getUsage(@Req() req: RequestWithUser): Promise<UsageSummary> {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    return this.aiUsageService.getUsageSummary(req.user.userId);
  }
}
