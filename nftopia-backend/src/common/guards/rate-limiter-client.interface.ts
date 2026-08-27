/** Shape rate-limiter-flexible resolves with (on success) or rejects with (on limit exceeded). */
export interface RateLimitConsumeResult {
  remainingPoints: number;
  msBeforeNext: number;
}

/**
 * Minimal contract satisfied by rate-limiter-flexible's RateLimiterRedis.
 * Guards depend on this instead of the concrete class so the Redis-backed
 * limiter can be swapped for a test double in unit tests.
 */
export interface RateLimiterClient {
  consume(key: string, points?: number): Promise<RateLimitConsumeResult>;
}
