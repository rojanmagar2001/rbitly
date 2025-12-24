import type { CreateLinkInput, LinkRepository } from "@/domain/repositories/LinkRepository";
import type { Link } from "@/domain/types/Link";
import type { PrismaClient } from "@/generated/prisma/client";

function mapLink(row: {
  id: string;
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  customAlias: string | null;
  isActive: boolean;
  createdByIpHash: string;
}): Link {
  return {
    id: row.id,
    code: row.code,
    originalUrl: row.originalUrl,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    customAlias: row.customAlias,
    isActive: row.isActive,
    createdByIpHash: row.createdByIpHash,
  };
}

export class PrismaLinkRepository implements LinkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLinkInput): Promise<Link> {
    const created = await this.prisma.link.create({
      data: {
        code: input.code,
        originalUrl: input.originalUrl,
        customAlias: input.customAlias,
        createdByIpHash: input.createdByIpHash,
      },
    });

    return mapLink(created);
  }

  async findByCode(code: string): Promise<Link | null> {
    const found = await this.prisma.link.findUnique({
      where: { code },
    });

    return found ? mapLink(found) : null;
  }
}
