import type { LinkCache } from "@/domain/caches/LinkCache";
import type { RateLimiter } from "@/domain/rate-limit/RateLimiter";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";

export type AppDeps = {
  linkRepository: LinkRepository;
  linkCache: LinkCache | null;
  rateLimiter: RateLimiter | null;
  ipHashSalt: string;
};
