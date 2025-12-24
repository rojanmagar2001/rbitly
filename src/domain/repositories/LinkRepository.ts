import type { Link } from "../types/Link";

export type CreateLinkInput = {
  code: string;
  originalUrl: string;
  expiresAt: Date | null;
  customAlias: string | null;
  createdByIpHash: string;
};

export interface LinkRepository {
  create(input: CreateLinkInput): Promise<Link>;
  findByCode(code: string): Promise<Link | null>;
}
