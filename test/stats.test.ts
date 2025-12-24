import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import client from "prom-client";

const noopTracker: ClickTracker = { async track() {} };

function makeLinkRepo(): LinkRepository {
  return {
    async create() {
      throw new Error("not used");
    },
    async findByCode(code: string) {
      if (code !== "abc123") return null;
      return {
        id: "link-1",
        code: "abc123",
        originalUrl: "https://example.com",
        createdAt: new Date(),
        expiresAt: null,
        customAlias: null,
        isActive: true,
        createdByIpHash: "iphash",
      };
    },
  };
}

function makeClickRepo(): ClickRepository {
  return {
    async createClick() {},
    async getStatsByLinkId(linkId: string) {
      if (linkId !== "link-1") return { totalClicks: 0, lastClickedAt: null };
      return { totalClicks: 5, lastClickedAt: new Date("2025-01-02T03:04:05.000Z") };
    },
  };
}

describe("GET /api/links/:code/stats", () => {
  it("returns aggregated stats", async () => {
    const registry = new client.Registry();
    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: makeLinkRepo(),
        linkCache: null,
        rateLimiter: null,
        clickTracker: noopTracker,
        clickRepository: makeClickRepo(),
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const res = await app.inject({ method: "GET", url: "/api/links/abc123/stats" });
    expect(res.statusCode).toBe(200);

    const body = res.json() as { code: string; totalClicks: number; lastClickedAt: string | null };
    expect(body.code).toBe("abc123");
    expect(body.totalClicks).toBe(5);
    expect(body.lastClickedAt).toBe("2025-01-02T03:04:05.000Z");

    await app.close();
  });

  it("returns 404 for unknown code", async () => {
    const registry = new client.Registry();
    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: makeLinkRepo(),
        linkCache: null,
        rateLimiter: null,
        clickTracker: noopTracker,
        clickRepository: makeClickRepo(),
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const res = await app.inject({ method: "GET", url: "/api/links/nope/stats" });
    expect(res.statusCode).toBe(404);

    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");

    await app.close();
  });
});
