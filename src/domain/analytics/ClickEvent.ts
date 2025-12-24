export type ClickEvent = {
  linkId: string;
  clickedAt: string; // ISO
  referrer: string | null;
  userAgent: string | null;
  ipHash: string;
  country: string | null;
};
