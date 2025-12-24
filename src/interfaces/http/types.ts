import type { LinkCache } from "@/domain/caches/LinkCache";
import type { LinkRepository } from "@/domain/repositories/LinkRepository";

export type AppDeps = {
  linkRepository: LinkRepository;
  linkCache: LinkCache | null;
  ipHashSalt: string;
};
