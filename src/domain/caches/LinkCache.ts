export type CachedLink = {
  code: string;
  originalUrl: string;
  expiresAt: string | null; // ISO string
  isActive: boolean;
};

export interface LinkCache {
  get(code: string): Promise<CachedLink | null>;
  set(code: string, value: CachedLink, ttlSeconds: number): Promise<void>;
}
