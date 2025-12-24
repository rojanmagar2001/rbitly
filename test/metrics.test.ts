import { describe, expect, it } from "vitest";
import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import client from "prom-client";

const noopRepo: LinkRepository = {
  async create() {
    throw new Error("not used");
  },
  async findByCode() {
    return null;
  },
};

const noopTracker: ClickTracker = { async track() {} };

const noopClickRepo: ClickRepository = {
  async createClick() {},
  async getStatsByLinkId() {
    return { totalClicks: 0, lastClickedAt: null };
  },
};

describe("GET /metrics", () => {
  it("returns metrics text", async () => {
    const registry = new client.Registry();

    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: noopRepo,
        linkCache: null,
        rateLimiter: null,
        clickTracker: noopTracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: null,
      },
    });

    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain("http_request_duration_seconds");

    await app.close();
  });

  it("requires token when METRICS_TOKEN is set", async () => {
    const registry = new client.Registry();

    const app = await createApp({
      logger: false,
      deps: {
        linkRepository: noopRepo,
        linkCache: null,
        rateLimiter: null,
        clickTracker: noopTracker,
        clickRepository: noopClickRepo,
        ipHashSalt: "test-salt",
        cookieSecret: "test-cookie-secret",
        metricsRegistry: registry,
        metricsToken: "secret",
      },
    });

    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(401);

    const ok = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: { authorization: "Bearer secret" },
    });
    expect(ok.statusCode).toBe(200);

    await app.close();
  });
});
