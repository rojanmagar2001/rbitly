import type { FastifyInstance } from "fastify";
import type { ResolveLinkUseCase } from "@/application/use-cases/ResolveLinkUseCase";

export async function registerRedirectRoute(
  app: FastifyInstance,
  deps: { resolveLinkUseCase: ResolveLinkUseCase },
): Promise<void> {
  app.get("/:code", async (req, reply) => {
    const code = (req.params as { code: string }).code;

    const result = await deps.resolveLinkUseCase.execute(code);

    reply.header("cache-control", "no-store");
    return reply.redirect(result.originalUrl, 302);
  });
}
