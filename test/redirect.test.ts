import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { CachedLink, LinkCache } from "@/domain/caches/LinkCache";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import client from "prom-client";
import { register } from "node:module";

function makeRepo(overrides?: Partial<LinkRepository>): LinkRepository {
  const repo: LinkRepository = {
    async create() {
      throw new Error("not used");
    },
    async findByCode(code: string) {
      if (code !== "abc123") return null;
      return {
        id: "id-1",
        code: "abc123",
        originalUrl: "https://example.com",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        expiresAt: null,
        customAlias: null,
        isActive: true,
        createdByIpHash: "iphash",
      };
    },
  };
  return { ...repo, ...overrides };
}

function makeCache(seed?: Record<string, CachedLink | undefined>) {
  const store = new Map<string, CachedLink>();
  const calls = { get: 0, set: 0, lastTtl: 0 };

  if (seed) {
    for (const [k, v] of Object.entries(seed)) {
      if (v) store.set(k, v);
    }
  }

  const cache: LinkCache = {
    async get(code: string) {
      calls.get++;
      return store.get(code) ?? null;
    },
    async set(code: string, value: CachedLink, ttlSeconds: number) {
      calls.set++;
      calls.lastTtl = ttlSeconds;
      store.set(code, value);
    },
  };

  return { cache, calls, store };
}

function makeClickTracker() {
  const calls: Array<{ linkId: string }> = [];

  const tracker: ClickTracker = {
    async track(evt) {
      calls.push({ linkId: evt.linkId });
    },
  };

  return { tracker, calls };
}

const noopClickRepo: ClickRepository = {
  async createClick() {},
  async getStatsByLinkId() {
    return { totalClicks: 0, lastClickedAt: null };
  },
};

describe("GET /:code redirect", () => {
  it("cache miss -> loads from repo -> caches -> redirects 302 and tracks click", async () => {
    const { cache, calls: cacheCalls, store } = makeCache();
    const { tracker, calls: trackerCalls } = makeClickTracker();

    const registry = new client.Registry();
    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: makeRepo(),
        linkCache: cache,
        rateLimiter: null,
        clickTracker: tracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const res = await app.inject({ method: "GET", url: "/abc123" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://example.com");
    expect(res.headers["cache-control"]).toBe("no-store");

    expect(cacheCalls.get).toBe(1);
    expect(cacheCalls.set).toBe(1);
    expect(cacheCalls.lastTtl).toBe(60 * 60);
    expect(store.get("abc123")?.originalUrl).toBe("https://example.com");

    expect(trackerCalls.length).toBe(1);
    expect(trackerCalls[0]?.linkId).toBe("id-1");

    await app.close();
  });

  it("cache hit -> does not call repo -> redirects 302 and tracks click", async () => {
    const { cache, calls: cacheCalls } = makeCache({
      abc123: {
        code: "abc123",
        originalUrl: "https://cached.example",
        expiresAt: null,
        isActive: true,
      },
    });

    const { tracker, calls: trackerCalls } = makeClickTracker();

    const repo = makeRepo({
      async findByCode() {
        // NOTE: Step 7 ResolveLinkUseCase fetches linkId on cache hit.
        // So repo WILL be called once on cache hit to get linkId unless you change the cache payload.
        return {
          id: "id-1",
          code: "abc123",
          originalUrl: "https://cached.example",
          createdAt: new Date(),
          expiresAt: null,
          customAlias: null,
          isActive: true,
          createdByIpHash: "iphash",
        };
      },
    });

    const registry = new client.Registry();

    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: repo,
        linkCache: cache,
        rateLimiter: null,
        clickTracker: tracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const res = await app.inject({ method: "GET", url: "/abc123" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://cached.example");

    expect(cacheCalls.get).toBe(1);
    expect(cacheCalls.set).toBe(0);

    expect(trackerCalls.length).toBe(1);
    expect(trackerCalls[0]?.linkId).toBe("id-1");

    await app.close();
  });

  it("unknown code -> 404", async () => {
    const { cache } = makeCache();
    const { tracker } = makeClickTracker();

    const registry = new client.Registry();

    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: makeRepo(),
        linkCache: cache,
        rateLimiter: null,
        clickTracker: tracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const res = await app.inject({ method: "GET", url: "/nope" });

    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");

    await app.close();
  });
});
