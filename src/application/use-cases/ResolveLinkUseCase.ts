import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import type { LinkCache } from "@/domain/caches/LinkCache";
import { NotFoundError } from "@/domain/errors/NotFoundError";

export type ResolveLinkResult = {
  code: string;
  originalUrl: string;
};

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

function ttlSecondsFor(expiresAt: Date | null, now: Date, defaultTtlSeconds: number): number {
  if (!expiresAt) return defaultTtlSeconds;
  const diffMs = expiresAt.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.floor(diffMs / 1000));
}

export class ResolveLinkUseCase {
  constructor(
    private readonly repo: LinkRepository,
    private readonly cache: LinkCache | null,
    private readonly opts: { defaultCacheTtlSeconds: number },
  ) {}

  async execute(code: string): Promise<ResolveLinkResult> {
    const now = new Date();

    if (this.cache) {
      const cached = await this.cache.get(code);
      if (cached) {
        const expiresAt = cached.expiresAt ? new Date(cached.expiresAt) : null;
        if (!cached.isActive || isExpired(expiresAt, now)) {
          throw new NotFoundError("Link not found.");
        }
        return { code, originalUrl: cached.originalUrl };
      }
    }

    const link = await this.repo.findByCode(code);
    if (!link || !link.isActive || isExpired(link.expiresAt, now)) {
      throw new NotFoundError("Link not found.");
    }

    if (this.cache) {
      const ttl = ttlSecondsFor(link.expiresAt, now, this.opts.defaultCacheTtlSeconds);
      if (ttl > 0) {
        await this.cache.set(
          code,
          {
            code,
            originalUrl: link.originalUrl,
            expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
            isActive: link.isActive,
          },
          ttl,
        );
      }
    }

    return { code, originalUrl: link.originalUrl };
  }
}
