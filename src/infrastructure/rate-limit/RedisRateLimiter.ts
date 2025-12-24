import type { RateLimiter, RateLimitResult } from "../../domain/rate-limit/RateLimiter";
import type { Redis } from "ioredis";

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = "rl:",
  ) {}

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = this.k(key);

    // INCR the counter; if it's new, set expiry
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      // expire after the fixed window
      await this.redis.expire(redisKey, windowSeconds);
    }

    if (count <= limit) return { allowed: true };

    const ttl = await this.redis.ttl(redisKey);
    const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

    return { allowed: false, retryAfterSeconds };
  }
}
