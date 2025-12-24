import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { RateLimiter } from "@/domain/rate-limit/RateLimiter";
import type { RateLimitResult } from "@/domain/rate-limit/RateLimiter";

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

describe("rate limiting: POST /api/links", () => {
  it("returns 429 after limit is exceeded", async () => {
    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: makeRepo(),
        linkCache: null,
        rateLimiter: makeLimiter(2),
        ipHashSalt: "test-salt",
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
