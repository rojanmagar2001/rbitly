export type Link = {
  id: string;
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  customAlias: string | null;
  isActive: boolean;
  createdByIpHash: string;
};
