import type { FastifyInstance } from "fastify";
import type { ResolveLinkUseCase } from "@/application/use-cases/ResolveLinkUseCase";
import type { ClickTracker } from "@/domain/analytics/ClickTracker";
import { hashIp } from "@/domain/security/hashIp";

function truncate(value: string | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export async function registerRedirectRoute(
  app: FastifyInstance,
  deps: { resolveLinkUseCase: ResolveLinkUseCase; clickTracker: ClickTracker; ipHashSalt: string },
): Promise<void> {
  app.get("/:code", async (req, reply) => {
    const code = (req.params as { code: string }).code;
    // We need linkId for analytics, so ResolveLinkUseCase must return it.
    const result = await deps.resolveLinkUseCase.execute(code);

    // Fire-and-forget analytics enqueue (best effort)
    void deps.clickTracker.track({
      linkId: result.linkId,
      clickedAt: new Date().toISOString(),
      referrer: truncate(req.headers.referer, 2048),
      userAgent: truncate(req.headers["user-agent"], 512),
      ipHash: hashIp(req.ip || "0.0.0.0", deps.ipHashSalt),
      country: null,
    });

    reply.header("cache-control", "no-store");
    return reply.redirect(result.originalUrl, 302);
  });
}
