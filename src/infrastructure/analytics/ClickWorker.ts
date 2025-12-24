import type { Redis } from "ioredis";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { ClickEvent } from "@/domain/analytics/ClickEvent";

export class ClickWorker {
  private running = false;

  constructor(
    private readonly redis: Redis,
    private readonly clickRepo: ClickRepository,
    private readonly opts: { queueKey?: string; brpopTimeoutSeconds?: number } = {},
  ) {}

  private key(): string {
    return this.opts.queueKey ?? "queue:clicks";
  }

  async start(): Promise<void> {
    this.running = true;
    void this.loop();
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  private async loop(): Promise<void> {
    const timeout = this.opts.brpopTimeoutSeconds ?? 1;

    while (this.running) {
      try {
        const res = await this.redis.brpop(this.key(), timeout);
        if (!res) continue;

        const [, raw] = res;
        const evt = JSON.parse(raw) as ClickEvent;

        await this.clickRepo.createClick({
          linkId: evt.linkId,
          clickedAt: new Date(evt.clickedAt),
          referrer: evt.referrer,
          userAgent: evt.userAgent,
          ipHash: evt.ipHash,
          country: evt.country,
        });
      } catch {
        // Best effort: never crash the server for analytics.
        // We will add logging/metrics in Step 9.
      }
    }
  }
}
