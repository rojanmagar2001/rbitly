import type { Redis } from "ioredis";
import type { ClickEvent } from "@/domain/analytics/ClickEvent";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";

export class RedisClickTracker implements ClickTracker {
  constructor(
    private readonly redis: Redis,
    private readonly opts: { queueKey?: string; maxQueueLength?: number } = {},
  ) {}

  private key(): string {
    return this.opts.queueKey ?? "queue:clicks";
  }

  async track(event: ClickEvent): Promise<void> {
    const payload = JSON.stringify(event);
    const key = this.key();

    // Best effort: enqueue and trim to cap memory during abuse
    await this.redis.lpush(key, payload);

    const maxLen = this.opts.maxQueueLength ?? 100_000;
    await this.redis.ltrim(key, 0, maxLen - 1);
  }
}
