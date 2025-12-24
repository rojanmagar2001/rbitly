export type CreateLinkDTO = {
  url: string;
  customAlias: string | null;
  expiresAt: Date | null;
  requesterIp: string;
};
