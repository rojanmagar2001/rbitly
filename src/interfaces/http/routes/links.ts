import type { CreateLinkUseCase } from "@/application/use-cases/CreateLinkUseCase";
import { hashIp } from "@/domain/security/hashIp";
import type { FastifyInstance } from "fastify";
import z from "zod";

const createLinkBodySchema = z.object({
  url: z.url(),
  customAlias: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  expiresAt: z.date().optional(),
});

function getRequesterIp(app: FastifyInstance, req: { ip: string }): string {
  // Fastify's req.ip is derived from connection; in production you must configure
  // `trustProxy` correctly to avoid spoofing.
  if (!req.ip) {
    app.log.warn("Request IP not available; using 0.0.0.0");
    return "0.0.0.0";
  }
  return req.ip;
}

export async function registerLinkRoutes(
  app: FastifyInstance,
  deps: { ipHashSalt: string; linkUseCase: CreateLinkUseCase },
): Promise<void> {
  app.post("/api/links", async (req, reply) => {
    const parsed = createLinkBodySchema.parse(req.body);

    const ip = getRequesterIp(app, req);
    const ipHash = hashIp(ip, deps.ipHashSalt);

    const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;

    const result = await deps.linkUseCase.execute({
      url: parsed.url,
      customAlias: parsed.customAlias ?? null,
      expiresAt,
      requesterIp: ipHash,
    });

    return reply.status(201).send({
      code: result.code,
      originalUrl: result.originalUrl,
      expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
    });
  });
}
