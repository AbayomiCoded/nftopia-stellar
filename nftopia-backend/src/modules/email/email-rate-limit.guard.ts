import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';

/**
 * Stricter, email-specific rate limit for endpoints that trigger an
 * outbound transactional email (registration, password-reset requests).
 * Keyed by the target email address when present so an attacker can't
 * hammer a single victim's inbox from many IPs; falls back to IP otherwise.
 */
@Injectable()
export class EmailRateLimitGuard implements CanActivate {
  private readonly limiter: RateLimiterRedis;
  private readonly points: number;
  private readonly duration: number;

  constructor(private readonly config: ConfigService) {
    this.points = Number(this.config.get('EMAIL_RATE_LIMIT_MAX') ?? 5);
    this.duration = Number(
      this.config.get('EMAIL_RATE_LIMIT_WINDOW_S') ?? 3600,
    );

    const client = new Redis({
      host: this.config.get<string>('REDIS_HOST') ?? 'localhost',
      port: Number(this.config.get('REDIS_PORT') ?? 6379),
      password: this.config.get<string>('REDIS_PASSWORD') ?? undefined,
    });

    this.limiter = new RateLimiterRedis({
      storeClient: client,
      points: this.points,
      duration: this.duration,
      keyPrefix: 'email-rl',
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const email = (req.body as { email?: string } | undefined)?.email
      ?.toLowerCase()
      .trim();
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.connection?.remoteAddress ||
      'unknown';
    const key = email
      ? `email:${email}`
      : `ip:${String(ip).split(',')[0].trim()}`;

    try {
      const rlRes = await this.limiter.consume(key, 1);
      res.setHeader('X-Email-RateLimit-Limit', String(this.points));
      res.setHeader(
        'X-Email-RateLimit-Remaining',
        String(Math.max(0, rlRes.remainingPoints ?? 0)),
      );
      return true;
    } catch (error: unknown) {
      const rejRes = error as RateLimiterRes;
      const retrySecs = Math.ceil((rejRes.msBeforeNext ?? 0) / 1000) || 1;
      res.setHeader('Retry-After', String(retrySecs));
      res.setHeader('X-Email-RateLimit-Limit', String(this.points));
      res.setHeader('X-Email-RateLimit-Remaining', '0');
      throw new HttpException(
        'Too many email requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
