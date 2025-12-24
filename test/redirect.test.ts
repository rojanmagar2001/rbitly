import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { CachedLink, LinkCache } from "@/domain/caches/LinkCache";

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

describe("GET /:code redirect", () => {
  it("cache miss -> loads from repo -> caches -> redirects 302", async () => {
    const { cache, calls, store } = makeCache();

    const app = await createApp({
      logger: false,
      deps: { linkRepository: makeRepo(), linkCache: cache, ipHashSalt: "test-salt" },
    });

    const res = await app.inject({ method: "GET", url: "/abc123" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://example.com");
    expect(res.headers["cache-control"]).toBe("no-store");

    expect(calls.get).toBe(1);
    expect(calls.set).toBe(1);
    expect(calls.lastTtl).toBe(60 * 60);
    expect(store.get("abc123")?.originalUrl).toBe("https://example.com");

    await app.close();
  });

  it("cache hit -> does not call repo -> redirects 302", async () => {
    const { cache, calls } = makeCache({
      abc123: {
        code: "abc123",
        originalUrl: "https://cached.example",
        expiresAt: null,
        isActive: true,
      },
    });

    const repo = makeRepo({
      async findByCode() {
        throw new Error("repo should not be called on cache hit");
      },
    });

    const app = await createApp({
      logger: false,
      deps: { linkRepository: repo, linkCache: cache, ipHashSalt: "test-salt" },
    });

    const res = await app.inject({ method: "GET", url: "/abc123" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://cached.example");

    expect(calls.get).toBe(1);
    expect(calls.set).toBe(0);

    await app.close();
  });

  it("unknown code -> 404", async () => {
    const { cache } = makeCache();

    const app = await createApp({
      logger: false,
      deps: { linkRepository: makeRepo(), linkCache: cache, ipHashSalt: "test-salt" },
    });

    const res = await app.inject({ method: "GET", url: "/nope" });

    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");

    await app.close();
  });
});
