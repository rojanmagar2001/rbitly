import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";

const noopRepo: LinkRepository = {
  async create() {
    throw new Error("not used");
  },
  async findByCode() {
    return null;
  },
};

const noopTracker: ClickTracker = {
  async track() {},
};

const noopClickRepo: ClickRepository = {
  async createClick() {},
  async getStatsByLinkId() {
    return { totalClicks: 0, lastClickedAt: null };
  },
};

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: noopRepo,
        linkCache: null,
        rateLimiter: null,
        clickTracker: noopTracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
      },
    });

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });
});
