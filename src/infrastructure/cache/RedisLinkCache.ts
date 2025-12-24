import type { CachedLink, LinkCache } from "@/domain/caches/LinkCache";
import type Redis from "ioredis";

type Stored = {
  originalUrl: string;
  expiresAt: string | null;
  isActive: boolean;
};

export class RedisLinkCache implements LinkCache {
  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix = "link:",
  ) {}

  private key(code: string): string {
    return `${this.keyPrefix}${code}`;
  }

  async get(code: string): Promise<CachedLink | null> {
    const raw = await this.redis.get(this.key(code));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Stored;

    return {
      code,
      originalUrl: parsed.originalUrl,
      expiresAt: parsed.expiresAt,
      isActive: parsed.isActive,
    };
  }

  async set(code: string, value: CachedLink, ttlSeconds: number): Promise<void> {
    const stored: Stored = {
      originalUrl: value.originalUrl,
      expiresAt: value.expiresAt,
      isActive: value.isActive,
    };

    // Redis EX must be >= 1
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    await this.redis.set(this.key(code), JSON.stringify(stored), "EX", ttl);
  }
}
