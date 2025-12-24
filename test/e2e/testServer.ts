/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { createApp } from "@/interfaces/http/createApp";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import type { RateLimiter } from "@/domain/rate-limit/RateLimiter";
import type { LinkCache } from "@/domain/caches/LinkCache";
import type { FastifyInstance } from "fastify";
import client from "prom-client";

class InMemoryLinkRepo implements LinkRepository {
  private byCode = new Map<string, any>();

  async create(input: any) {
    const id = `link-${Math.random().toString(16).slice(2)}`;
    const row = {
      id,
      code: input.code,
      originalUrl: input.originalUrl,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      customAlias: input.customAlias,
      isActive: true,
      createdByIpHash: input.createdByIpHash,
    };
    this.byCode.set(row.code, row);
    return row;
  }

  async findByCode(code: string) {
    return this.byCode.get(code) ?? null;
  }
}

const noopTracker: ClickTracker = { async track() {} };

const noopClickRepo: ClickRepository = {
  async createClick() {},
  async getStatsByLinkId() {
    return { totalClicks: 0, lastClickedAt: null };
  },
};

export async function startTestServer(): Promise<{ app: FastifyInstance; url: string }> {
  const registry = new client.Registry();
  const app = await createApp({
    logger: false,
    deps: {
      linkRepository: new InMemoryLinkRepo(),
      linkCache: null as LinkCache | null,
      rateLimiter: null as RateLimiter | null,
      clickTracker: noopTracker,
      clickRepository: noopClickRepo,
      ipHashSalt: "test-salt",
      cookieSecret: "test-cookie-secret",
      metricsRegistry: registry,
      metricsToken: null,
    },
  });

  await app.listen({ host: "127.0.0.1", port: 3100 });
  return { app, url: "http://127.0.0.1:3100" };
}

export async function stopTestServer(app: FastifyInstance): Promise<void> {
  await app.close();
}
