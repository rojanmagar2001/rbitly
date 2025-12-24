import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";

const noopRepo: LinkRepository = {
  async create() {
    throw new Error("not used");
  },
  async findByCode() {
    return null;
  },
};

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = await createApp({
      logger: false,
      deps: { linkRepository: noopRepo, ipHashSalt: "test-salt" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });
});
