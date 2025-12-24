import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import Redis from "ioredis";
import { startInfra, stopInfra, type StartedInfra } from "@/../test/integration/testcontainers";
import { PrismaLinkRepository } from "@/infrastructure/repositories/PrismaLinkRepository";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/infrastructure/prisma/client";
import { Client } from "pg";

async function createExtensionWithRetry(databaseUrl: string, maxRetries = 5): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
      await client.end();
      return; // Success!
    } catch (error) {
      if (i === maxRetries - 1) throw error; // Last attempt failed
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
}

describe("integration: postgres + redis", () => {
  let infra: StartedInfra;
  let prisma: PrismaClient;

  beforeAll(async () => {
    infra = await startInfra();

    // Point Prisma at the ephemeral Postgres
    process.env["DATABASE_URL"] = infra.databaseUrl;

    // Enable pgcrypto to support gen_random_uuid()
    // We do it before migrations to avoid failures.
    await createExtensionWithRetry(infra.databaseUrl);

    // Apply migrations to the container DB
    execSync("pnpm exec prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: infra.databaseUrl },
    });

    prisma = createPrismaClient();
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await stopInfra(infra);
  });

  it("can create and read a link via repository", async () => {
    const repo = new PrismaLinkRepository(prisma);

    const created = await repo.create({
      code: "abc123",
      originalUrl: "https://example.com",
      expiresAt: null,
      customAlias: null,
      createdByIpHash: "iphash",
    });

    expect(created.code).toBe("abc123");

    const found = await repo.findByCode("abc123");
    expect(found).not.toBeNull();
    expect(found?.originalUrl).toBe("https://example.com");
  });

  it("can connect to redis", async () => {
    const redis = new Redis(infra.redisUrl);
    try {
      const pong = await redis.ping();
      expect(pong).toBe("PONG");
    } finally {
      redis.disconnect();
    }
  });
});
