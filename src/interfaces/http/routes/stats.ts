import type { FastifyInstance } from "fastify";
import type { GetLinkStatsUseCase } from "@/application/use-cases/GetLinkStatsUseCase";

export async function registerStatsRoutes(
  app: FastifyInstance,
  deps: { getLinkStatsUseCase: GetLinkStatsUseCase },
): Promise<void> {
  app.get("/api/links/:code/stats", async (req) => {
    const code = (req.params as { code: string }).code;
    return deps.getLinkStatsUseCase.execute(code);
  });
}
