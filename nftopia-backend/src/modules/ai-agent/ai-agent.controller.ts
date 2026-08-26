import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiAgentService } from './ai-agent.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  async chat(@Body() dto: ChatRequestDto): Promise<{ reply: string }> {
    const reply = await this.aiAgentService.chat(dto.message, dto.history);
    return { reply };
  }
}
