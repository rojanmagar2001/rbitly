import "dotenv/config";
import { createApp } from "./interfaces/http/createApp";
import { createPrismaClient } from "./infrastructure/prisma/client";
import { PrismaLinkRepository } from "./infrastructure/repositories/PrismaLinkRepository";
import { RedisLinkCache } from "./infrastructure/cache/RedisLinkCache";
import { createRedisClient } from "./infrastructure/redis/client";

function parsePort(value: string | undefined): number {
  if (!value) return 3000;

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return 3000;
  return port;
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

  const ipHashSalt = process.env["IP_HASH_SALT"] ?? "dev-unsafe-salt";

  const redisUrl = process.env["REDIS_URL"];
  const linkCache = redisUrl ? new RedisLinkCache(createRedisClient(redisUrl)) : null;
  const app = await createApp({
    logger: true,
    deps: {
      linkRepository,
      linkCache,
      ipHashSalt,
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
