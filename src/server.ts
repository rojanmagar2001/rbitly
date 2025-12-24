import "dotenv/config";
import { createApp } from "./interfaces/http/createApp";
import { createPrismaClient } from "./infrastructure/prisma/client";
import { PrismaLinkRepository } from "./infrastructure/repositories/PrismaLinkRepository";
import { RedisLinkCache } from "./infrastructure/cache/RedisLinkCache";
import { createRedisClient } from "./infrastructure/redis/client";
import { RedisRateLimiter } from "./infrastructure/rate-limit/RedisRateLimiter";
import { RedisClickTracker } from "./infrastructure/analytics/RedisClickTracker";
import { ClickWorker } from "./infrastructure/analytics/ClickWorker";
import { PrismaClickRepository } from "./infrastructure/repositories/PrismaClickRepository";
import { createMetrics } from "./infrastructure/metrics/registry";

function parsePort(value: string | undefined): number {
  if (!value) return 3000;

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return 3000;
  return port;
}

class NoopClickTracker {
  async track(): Promise<void> {}
}

//
// function requireEnv(name: string): string {
//   const value = process.env[name];
//   if (!value) throw new Error(`Missing required env var: ${name}`);
//   return value;
// }

async function main(): Promise<void> {
  const prisma = createPrismaClient();
  const linkRepository = new PrismaLinkRepository(prisma);
  const clickRepository = new PrismaClickRepository(prisma);

  const ipHashSalt = process.env["IP_HASH_SALT"] ?? "dev-unsafe-salt";

  // NEW: cookie signing secret
  const cookieSecret = process.env["COOKIE_SECRET"] ?? "dev-cookie-secret-change-me";

  const metricsToken = process.env["METRICS_TOKEN"] ?? null;
  const { registry } = createMetrics();

  const redisUrl = process.env["REDIS_URL"];
  const redis = redisUrl ? createRedisClient(redisUrl) : null;

  const linkCache = redis ? new RedisLinkCache(redis) : null;
  const rateLimiter = redis ? new RedisRateLimiter(redis) : null;

  const clickTracker = redis ? new RedisClickTracker(redis) : new NoopClickTracker();

  // Start worker only if Redis exists (queue transport)
  const worker = redis ? new ClickWorker(redis, clickRepository) : null;
  if (worker) await worker.start();

  const app = await createApp({
    logger: true,
    deps: {
      linkRepository,
      linkCache,
      rateLimiter,
      clickTracker,
      clickRepository,
      ipHashSalt,
      cookieSecret,
      metricsRegistry: registry,
      metricsToken,
    },
  });

  const port = parsePort(process.env["PORT"]);
  const host = process.env["HOST"] ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exitCode = 1;
  } finally {
    // In real prod shutdown we’ll handle SIGTERM; keep it simple for now.
    // Prisma connection stays open while server is running.
  }
}

void main();
