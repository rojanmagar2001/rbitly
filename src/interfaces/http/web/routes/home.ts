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
  /* eslint-disable @typescript-eslint/no-base-to-string */
  const host = String(req.headers["host"] ?? "localhost:3000");
  // In production behind TLS termination, you'd derive scheme from trusted headers + config.
  return `http://${host}`;
}

function toIsoFromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  // datetime-local is "YYYY-MM-DDTHH:mm" (no timezone); interpret as local time.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function registerHomeRoutes(
  app: FastifyInstance,
  deps: { createLinkUseCase: CreateLinkUseCase; ipHashSalt: string },
): Promise<void> {
  app.get("/", async (_req, reply) => {
    return reply.view("home.njk", {
      title: "rbitly",
      form: { url: "", customAlias: "", expiresAt: "" },
      result: null,
      error: null,
    });
  });

  app.post("/", async (req, reply) => {
    const body = formSchema.safeParse(req.body);
    if (!body.success) {
      return reply.view("home.njk", {
        title: "rbitly",
        form: { url: "", customAlias: "", expiresAt: "" },
        result: null,
        error: "Please provide a valid URL.",
      });
    }

    const parsed = body.data;
    const expiresIso = toIsoFromDatetimeLocal(parsed.expiresAt ?? "");
    const expiresAt = expiresIso ? new Date(expiresIso) : null;

    const ip = req.ip || "0.0.0.0";
    const ipHash = hashIp(ip, deps.ipHashSalt);

    try {
      const created = await deps.createLinkUseCase.execute({
        url: parsed.url,
        customAlias: parsed.customAlias ? parsed.customAlias : null,
        expiresAt,
        requesterIp: ipHash,
      });

      const baseUrl = baseUrlFromRequest(req);
      const shortUrl = `${baseUrl}/${created.code}`;

      return reply.view("home.njk", {
        title: "rbitly",
        form: {
          url: parsed.url,
          customAlias: parsed.customAlias ?? "",
          expiresAt: parsed.expiresAt ?? "",
        },
        result: { shortUrl },
        error: null,
      });
    } catch (err) {
      // Keep UI error messages generic; API keeps structured errors.
      app.log.warn({ err }, "Failed to create link from web form");
      return reply.view("home.njk", {
        title: "rbitly",
        form: {
          url: parsed.url,
          customAlias: parsed.customAlias ?? "",
          expiresAt: parsed.expiresAt ?? "",
        },
        result: null,
        error: "Could not create the link. Please try again.",
      });
    }
  });
}
