/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-base-to-string */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CreateLinkUseCase } from "@/application/use-cases/CreateLinkUseCase";
import { hashIp } from "@/domain/security/hashIp";

const formSchema = z.object({
  url: z.url(),
  customAlias: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

function baseUrlFromRequest(req: { headers: Record<string, unknown> }): string {
  const host = String(req.headers["host"] ?? "localhost:3000");
  return `http://${host}`;
}

function toIsoFromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type RecentItem = { code: string };
const RECENT_COOKIE = "recent_links_v1";
const MAX_RECENT = 5;

function safeParseRecent(value: string): RecentItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is RecentItem => Boolean(x) && typeof (x as any).code === "string")
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function readRecent(req: any): RecentItem[] {
  const raw = req.cookies?.[RECENT_COOKIE];
  if (!raw) return [];

  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid) return [];

  return safeParseRecent(unsigned.value);
}

function writeRecent(reply: any, items: RecentItem[]): void {
  const value = JSON.stringify(items.slice(0, MAX_RECENT));
  reply.setCookie(RECENT_COOKIE, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS in prod
    maxAge: 60 * 60 * 24 * 7, // 7 days
    signed: true,
  });
}

function toRecentView(items: RecentItem[], baseUrl: string) {
  return items.map((x) => ({
    shortUrl: `${baseUrl}/${x.code}`,
    statsUrl: `${baseUrl}/api/links/${x.code}/stats`,
  }));
}

export async function registerHomeRoutes(
  app: FastifyInstance,
  deps: { createLinkUseCase: CreateLinkUseCase; ipHashSalt: string },
): Promise<void> {
  app.get("/", async (req, reply) => {
    const baseUrl = baseUrlFromRequest(req);
    const recentLinks = toRecentView(readRecent(req), baseUrl);

    return reply.view("home.njk", {
      title: "rbitly",
      form: { url: "", customAlias: "", expiresAt: "" },
      result: null,
      errorSummary: null,
      fieldErrors: {},
      recentLinks,
    });
  });

  app.post("/", async (req, reply) => {
    const baseUrl = baseUrlFromRequest(req);
    const recentBefore = readRecent(req);
    const recentLinksBefore = toRecentView(recentBefore, baseUrl);

    const parsed = formSchema.safeParse(req.body);
    if (!parsed.success) {
      // You currently don't show errors; keep behavior consistent for now.
      // (If you want, next step we can render errorSummary + fieldErrors.)
      return reply.view("home.njk", {
        title: "rbitly",
        form: { url: "", customAlias: "", expiresAt: "" },
        result: null,
        errorSummary: null,
        fieldErrors: {},
        recentLinks: recentLinksBefore,
      });
    }

    const data = parsed.data;
    const expiresIso = toIsoFromDatetimeLocal(data.expiresAt ?? "");
    const expiresAt = expiresIso ? new Date(expiresIso) : null;

    const ip = req.ip || "0.0.0.0";
    const ipHash = hashIp(ip, deps.ipHashSalt);

    const created = await deps.createLinkUseCase.execute({
      url: data.url,
      customAlias: data.customAlias ? data.customAlias : null,
      expiresAt,
      requesterIp: ipHash,
    });

    // Update recent cookie (most recent first, unique)
    const next = [
      { code: created.code },
      ...recentBefore.filter((x) => x.code !== created.code),
    ].slice(0, MAX_RECENT);
    writeRecent(reply, next);

    const shortUrl = `${baseUrl}/${created.code}`;
    const statsUrl = `${baseUrl}/api/links/${created.code}/stats`;

    return reply.view("home.njk", {
      title: "rbitly",
      form: { url: data.url, customAlias: data.customAlias ?? "", expiresAt: data.expiresAt ?? "" },
      result: { shortUrl, statsUrl },
      errorSummary: null,
      fieldErrors: {},
      recentLinks: toRecentView(next, baseUrl),
    });
  });
}
