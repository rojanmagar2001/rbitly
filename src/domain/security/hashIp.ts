import { createHmac } from "node:crypto";

/**
 * Hash IP address using HMAC-SHA256.
 * NOTE: You MUST set a strong secret salt in production.
 */
export function hashIp(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(ip).digest("hex");
}
