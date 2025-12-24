import fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoute } from "./routes/health";
import type { AppDeps } from "./types";
import { CreateLinkUseCase } from "@/application/use-cases/CreateLinkUseCase";
import { registerLinkRoutes } from "./routes/links";
import { registerErrorHandler } from "./error/errorHandler";
import { ResolveLinkUseCase } from "@/application/use-cases/ResolveLinkUseCase";
import { registerRedirectRoute } from "./routes/redirect";

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

  const createLinkUseCase = new CreateLinkUseCase(options.deps.linkRepository, {
    ipHashSalt: options.deps.ipHashSalt,
    codeLength: 7,
    maxRetries: 5,
  });

  const resolveLinkUseCase = new ResolveLinkUseCase(
    options.deps.linkRepository,
    options.deps.linkCache,
    { defaultCacheTtlSeconds: 60 * 60 },
  );

  await registerLinkRoutes(app, {
    ipHashSalt: options.deps.ipHashSalt,
    linkUseCase: createLinkUseCase,
    rateLimiter: options.deps.rateLimiter,
  });
  await registerRedirectRoute(app, { resolveLinkUseCase });

  return app;
}
