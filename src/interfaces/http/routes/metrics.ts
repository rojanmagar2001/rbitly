import type { FastifyInstance } from "fastify";
import type { Registry } from "prom-client";
import { UnauthorizedError } from "@/domain/errors/UnauthorizedError";

export async function registerMetricsRoute(
  app: FastifyInstance,
  deps: { registry: Registry; metricsToken: string | null },
): Promise<void> {
  app.get("/metrics", async (req, reply) => {
    if (deps.metricsToken) {
      const header = req.headers["authorization"];
      const token =
        typeof header === "string" && header.startsWith("Bearer ")
          ? header.slice("Bearer ".length)
          : null;

      if (!token || token !== deps.metricsToken) {
        throw new UnauthorizedError("Unauthorized");
      }
    }

    const body = await deps.registry.metrics();
    reply.header("content-type", deps.registry.contentType);
    return body;
  });
}
