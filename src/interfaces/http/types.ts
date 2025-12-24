import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import type { LinkCache } from "@/domain/caches/LinkCache";
import type { RateLimiter } from "@/domain/rate-limit/RateLimiter";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";

export type AppDeps = {
  linkRepository: LinkRepository;
  linkCache: LinkCache | null;
  rateLimiter: RateLimiter | null;
  clickTracker: ClickTracker;
  clickRepository: ClickRepository;
  ipHashSalt: string;
};
