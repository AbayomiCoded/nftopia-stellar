import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type {
  RateLimitConsumeResult,
  RateLimiterClient,
} from './rate-limiter-client.interface';

export const AI_CHAT_RATE_LIMITER = 'AI_CHAT_RATE_LIMITER';

type RequestWithUser = Request & { user?: { userId?: string } };

/**
 * Per-user rate limiter for POST /ai/chat. Each request can trigger several
 * Anthropic API calls inside AiAgentService's tool-calling loop, so this is
 * deliberately keyed by the authenticated user id rather than IP (RedisRateGuard's
 * key) and configured independently via AI_CHAT_RATE_LIMIT_POINTS /
 * AI_CHAT_RATE_LIMIT_TTL so it can be tuned tighter than the global limit.
 *
 * Must run after JwtAuthGuard so req.user.userId is populated. Falls back to
 * IP keying only if a user id is unexpectedly missing.
 */
@Injectable()
export class AiChatRateLimitGuard implements CanActivate {
  private readonly points: number;

  constructor(
    @Inject(AI_CHAT_RATE_LIMITER)
    private readonly limiter: RateLimiterClient,
    private readonly config: ConfigService,
  ) {
    this.points = Number(this.config.get('AI_CHAT_RATE_LIMIT_POINTS') ?? 20);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const res = context.switchToHttp().getResponse<Response>();

    const key = this.resolveKey(req);

    try {
      const result = await this.limiter.consume(key, 1);
      res.setHeader('X-RateLimit-Limit', String(this.points));
      res.setHeader(
        'X-RateLimit-Remaining',
        String(Math.max(0, result.remainingPoints ?? 0)),
      );
      return true;
    } catch (error: unknown) {
      const rejRes = error as RateLimitConsumeResult;
      const retrySecs = Math.ceil((rejRes.msBeforeNext ?? 0) / 1000) || 1;
      res.setHeader('Retry-After', String(retrySecs));
      res.setHeader('X-RateLimit-Limit', String(this.points));
      res.setHeader('X-RateLimit-Remaining', '0');
      throw new HttpException(
        'Too many AI chat requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private resolveKey(req: RequestWithUser): string {
    const userId = req.user?.userId;
    if (userId) {
      return `user:${userId}`;
    }

    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.connection?.remoteAddress ||
      'unknown';
    return `ip:${String(ip).split(',')[0].trim()}`;
  }
}
