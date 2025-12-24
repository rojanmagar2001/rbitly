import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { RateLimiter, RateLimitResult } from "@/domain/rate-limit/RateLimiter";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import client from "prom-client";

function makeRepo(): LinkRepository {
  return {
    async create(input) {
      return {
        id: "id-1",
        code: input.code,
        originalUrl: input.originalUrl,
        createdAt: new Date(),
        expiresAt: input.expiresAt,
        customAlias: input.customAlias,
        isActive: true,
        createdByIpHash: input.createdByIpHash,
      };
    },
    async findByCode() {
      return null;
    },
  };
}

function makeLimiter(allowedCount: number): RateLimiter {
  let count = 0;
  return {
    async consume(): Promise<RateLimitResult> {
      count++;
      if (count <= allowedCount) return { allowed: true };
      return { allowed: false, retryAfterSeconds: 60 };
    },
  };
}

const noopTracker: ClickTracker = { async track() {} };

const noopClickRepo: ClickRepository = {
  async createClick() {},
  async getStatsByLinkId() {
    return { totalClicks: 0, lastClickedAt: null };
  },
};

describe("rate limiting: POST /api/links", () => {
  it("returns 429 after limit is exceeded", async () => {
    const registry = new client.Registry();

    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: makeRepo(),
        linkCache: null,
        rateLimiter: makeLimiter(2),
        clickTracker: noopTracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const payload = { url: "https://example.com" };

    const r1 = await app.inject({ method: "POST", url: "/api/links", payload });
    expect(r1.statusCode).toBe(201);

    const r2 = await app.inject({ method: "POST", url: "/api/links", payload });
    expect(r2.statusCode).toBe(201);

    const r3 = await app.inject({ method: "POST", url: "/api/links", payload });
    expect(r3.statusCode).toBe(429);
    expect(r3.headers["retry-after"]).toBe("60");

    const body = r3.json() as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMIT");

    await app.close();
  });
});
