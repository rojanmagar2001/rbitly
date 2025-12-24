export type LinkStats = {
  totalClicks: number;
  lastClickedAt: Date | null;
};

export interface ClickRepository {
  createClick(input: {
    linkId: string;
    clickedAt: Date;
    referrer: string | null;
    userAgent: string | null;
    ipHash: string;
    country: string | null;
  }): Promise<void>;

  getStatsByLinkId(linkId: string): Promise<LinkStats>;
}
