import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";

function makeRepo(): LinkRepository {
  return {
    async create(input) {
      return {
        id: "id-1",
        code: input.code,
        originalUrl: input.originalUrl,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
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

describe("POST /api/links", () => {
  it("creates a link with generated code", async () => {
    const app = await createApp({
      logger: false,
      deps: { linkRepository: makeRepo(), ipHashSalt: "test-salt" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/links",
      payload: { url: "https://example.com" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { code: string; originalUrl: string; expiresAt: string | null };

    expect(body.originalUrl).toBe("https://example.com");
    expect(typeof body.code).toBe("string");
    expect(body.code.length).toBeGreaterThanOrEqual(3);
    expect(body.expiresAt).toBeNull();

    await app.close();
  });

  it("creates a link with customAlias as code", async () => {
    const app = await createApp({
      logger: false,
      deps: { linkRepository: makeRepo(), ipHashSalt: "test-salt" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/links",
      payload: { url: "https://example.com", customAlias: "my-alias_123" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { code: string; originalUrl: string; expiresAt: string | null };
    expect(body.code).toBe("my-alias_123");

    await app.close();
  });

  it("returns 400 for invalid url", async () => {
    const app = await createApp({
      logger: false,
      deps: { linkRepository: makeRepo(), ipHashSalt: "test-salt" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/links",
      payload: { url: "not-a-url" },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");

    await app.close();
  });
});
