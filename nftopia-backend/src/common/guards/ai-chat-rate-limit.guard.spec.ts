import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AiChatRateLimitGuard } from './ai-chat-rate-limit.guard';
import type { RateLimiterClient } from './rate-limiter-client.interface';

describe('AiChatRateLimitGuard', () => {
  let guard: AiChatRateLimitGuard;

  const limiter: jest.Mocked<RateLimiterClient> = {
    consume: jest.fn(),
  };

  const config = {
    get: jest.fn(),
  };

  const makeContext = (
    overrides: {
      user?: { userId?: string };
      ip?: string;
      forwardedFor?: string;
    } = {},
  ) => {
    const req = {
      user: overrides.user,
      ip: overrides.ip ?? '127.0.0.1',
      headers: overrides.forwardedFor
        ? { 'x-forwarded-for': overrides.forwardedFor }
        : {},
    };
    const res = { setHeader: jest.fn() };

    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    return { context, req, res };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'AI_CHAT_RATE_LIMIT_POINTS') return 20;
      return undefined;
    });

    guard = new AiChatRateLimitGuard(
      limiter,
      config as unknown as ConfigService,
    );
  });

  it('allows an under-limit request and sets rate limit headers', async () => {
    limiter.consume.mockResolvedValue({ remainingPoints: 19, msBeforeNext: 0 });
    const { context, res } = makeContext({ user: { userId: 'user-1' } });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '19');
    expect(res.setHeader).not.toHaveBeenCalledWith(
      'Retry-After',
      expect.anything(),
    );
  });

  it('rejects an over-limit request with 429 and sets Retry-After / remaining=0', async () => {
    limiter.consume.mockRejectedValue({
      remainingPoints: 0,
      msBeforeNext: 5000,
    });
    const { context, res } = makeContext({ user: { userId: 'user-1' } });

    let caught: unknown;
    try {
      await guard.canActivate(context);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
  });

  it('rounds up a sub-second Retry-After to at least 1 second', async () => {
    limiter.consume.mockRejectedValue({
      remainingPoints: 0,
      msBeforeNext: 200,
    });
    const { context, res } = makeContext({ user: { userId: 'user-1' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '1');
  });

  it('keys the limiter by the authenticated user id, not the IP', async () => {
    limiter.consume.mockResolvedValue({ remainingPoints: 19, msBeforeNext: 0 });
    const { context } = makeContext({
      user: { userId: 'user-42' },
      ip: '203.0.113.5',
    });

    await guard.canActivate(context);

    expect(limiter.consume).toHaveBeenCalledWith('user:user-42', 1);
    expect(limiter.consume).not.toHaveBeenCalledWith(
      expect.stringContaining('203.0.113.5'),
      expect.anything(),
    );
  });

  it('gives different users independent limiter keys', async () => {
    limiter.consume.mockResolvedValue({ remainingPoints: 19, msBeforeNext: 0 });

    const { context: contextA } = makeContext({ user: { userId: 'user-a' } });
    const { context: contextB } = makeContext({ user: { userId: 'user-b' } });

    await guard.canActivate(contextA);
    await guard.canActivate(contextB);

    expect(limiter.consume).toHaveBeenNthCalledWith(1, 'user:user-a', 1);
    expect(limiter.consume).toHaveBeenNthCalledWith(2, 'user:user-b', 1);
  });

  it('falls back to IP keying when no authenticated user is present', async () => {
    limiter.consume.mockResolvedValue({ remainingPoints: 19, msBeforeNext: 0 });
    const { context } = makeContext({ ip: '203.0.113.5' });

    await guard.canActivate(context);

    expect(limiter.consume).toHaveBeenCalledWith('ip:203.0.113.5', 1);
  });

  it('prefers x-forwarded-for over req.ip in the IP fallback', async () => {
    limiter.consume.mockResolvedValue({ remainingPoints: 19, msBeforeNext: 0 });
    const { context } = makeContext({
      ip: '127.0.0.1',
      forwardedFor: '198.51.100.9, 10.0.0.1',
    });

    await guard.canActivate(context);

    expect(limiter.consume).toHaveBeenCalledWith('ip:198.51.100.9', 1);
  });

  it('reads the points threshold from AI_CHAT_RATE_LIMIT_POINTS', () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'AI_CHAT_RATE_LIMIT_POINTS') return 5;
      return undefined;
    });

    const customGuard = new AiChatRateLimitGuard(
      limiter,
      config as unknown as ConfigService,
    );

    expect((customGuard as unknown as { points: number }).points).toBe(5);
  });

  it('defaults to 20 points when AI_CHAT_RATE_LIMIT_POINTS is not configured', () => {
    config.get.mockReturnValue(undefined);

    const defaultGuard = new AiChatRateLimitGuard(
      limiter,
      config as unknown as ConfigService,
    );

    expect((defaultGuard as unknown as { points: number }).points).toBe(20);
  });
});
