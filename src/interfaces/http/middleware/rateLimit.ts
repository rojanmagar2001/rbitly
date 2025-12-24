import type { FastifyReply, FastifyRequest } from "fastify";
import type { RateLimiter } from "@/domain/rate-limit/RateLimiter";
import { RateLimitError } from "@/domain/errors/RateLimitError";

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
  keyPrefix: string; // e.g. "create-link"
};

function getClientIp(req: FastifyRequest): string {
  // Fastify's req.ip depends on trustProxy configuration in real deployments.
  return req.ip || "0.0.0.0";
}

export function makeRateLimitPreHandler(deps: {
  rateLimiter: RateLimiter | null;
  ipHasher: (ip: string) => string;
  config: RateLimitConfig;
}) {
  return async function rateLimitPreHandler(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!deps.rateLimiter) return; // no redis configured => no rate limit (dev)

    const ip = getClientIp(req);
    const ipHash = deps.ipHasher(ip);
    const key = `${deps.config.keyPrefix}:${ipHash}`;

    const result = await deps.rateLimiter.consume(
      key,
      deps.config.limit,
      deps.config.windowSeconds,
    );

    if (!result.allowed) {
      reply.header("retry-after", String(result.retryAfterSeconds));
      throw new RateLimitError("Too many requests. Pleas try again later.");
    }
  };
}
