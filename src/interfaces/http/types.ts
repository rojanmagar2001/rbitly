import type { LinkRepository } from "@/domain/repositories/LinkRepository";

export type AppDeps = {
  linkRepository: LinkRepository;
  ipHashSalt: string;
};
