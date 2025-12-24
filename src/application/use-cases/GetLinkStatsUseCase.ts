import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import { NotFoundError } from "@/domain/errors/NotFoundError";
import type { ClickRepository } from "@/domain/repositories/ClickRepository";

export type LinkStatsDTO = {
  code: string;
  totalClicks: number;
  lastClickedAt: string | null;
};

export class GetLinkStatsUseCase {
  constructor(
    private readonly linkRepo: LinkRepository,
    private readonly clickRepo: ClickRepository,
  ) {}

  async execute(code: string): Promise<LinkStatsDTO> {
    const link = await this.linkRepo.findByCode(code);
    if (!link) throw new NotFoundError("Link not found.");

    const stats = await this.clickRepo.getStatsByLinkId(link.id);

    return {
      code,
      totalClicks: stats.totalClicks,
      lastClickedAt: stats.lastClickedAt ? stats.lastClickedAt.toISOString() : null,
    };
  }
}
