import fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoute } from "./routes/health";
import type { AppDeps } from "./types";
import { CreateLinkUseCase } from "@/applications/use-cases/CreateLinkUseCase";
import { registerLinkRoutes } from "./routes/routes/links";
import { registerErrorHandler } from "./error/errorHandler";

export type CreateAppOptions = {
  logger?: boolean;
  deps: AppDeps;
};

export async function createApp(options: CreateAppOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? true,
  });

  // NOTE: trustProxy is critical when behind proxies; we’ll configure later with env.
  // app.setTrustProxy(true);

  registerErrorHandler(app);

  await registerHealthRoute(app);

  const linkUseCase = new CreateLinkUseCase(options.deps.linkRepository, {
    ipHashSalt: options.deps.ipHashSalt,
    codeLength: 7,
    maxRetries: 5,
  });

  await registerLinkRoutes(app, { ipHashSalt: options.deps.ipHashSalt, linkUseCase });

  return app;
}
