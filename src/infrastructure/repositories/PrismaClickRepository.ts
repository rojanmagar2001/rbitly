import type { ClickRepository, LinkStats } from "@/domain/repositories/ClickRepository";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaClickRepository implements ClickRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createClick(input: {
    linkId: string;
    clickedAt: Date;
    referrer: string | null;
    userAgent: string | null;
    ipHash: string;
    country: string | null;
  }): Promise<void> {
    await this.prisma.click.create({
      data: {
        linkId: input.linkId,
        clickedAt: input.clickedAt,
        referrer: input.referrer,
        userAgent: input.userAgent,
        ipHash: input.ipHash,
        country: input.country,
      },
    });
  }

  async getStatsByLinkId(linkId: string): Promise<LinkStats> {
    const res = await this.prisma.click.aggregate({
      where: { linkId },
      _count: { _all: true },
      _max: { clickedAt: true },
    });

    return {
      totalClicks: res._count._all,
      lastClickedAt: res._max.clickedAt ?? null,
    };
  }
}
