import fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoute } from "./routes/health";
import type { AppDeps } from "./types";
import { CreateLinkUseCase } from "@/application/use-cases/CreateLinkUseCase";
import { registerLinkRoutes } from "./routes/links";
import { registerErrorHandler } from "./error/errorHandler";
import { ResolveLinkUseCase } from "@/application/use-cases/ResolveLinkUseCase";
import { registerRedirectRoute } from "./routes/redirect";
import { GetLinkStatsUseCase } from "@/application/use-cases/GetLinkStatsUseCase";
import { registerStatsRoutes } from "./routes/stats";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import view from "@fastify/view";
import nunjucks from "nunjucks";
import { registerHomeRoutes } from "./web/routes/home";

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

  // Parsing for web forms
  await app.register(fastifyFormbody);

  // Static assets
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    prefix: "/",
  });

  // Views (Nunjucks)
  await app.register(view, {
    engine: { nunjucks },
    root: path.join(process.cwd(), "src/interfaces/http/web/templates"),
    options: {
      autoescape: true,
      throwOnUndefined: false,
    },
  });

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

  const getLinkStatsUseCase = new GetLinkStatsUseCase(
    options.deps.linkRepository,
    options.deps.clickRepository,
  );

  // Web UI
  await registerHomeRoutes(app, { createLinkUseCase, ipHashSalt: options.deps.ipHashSalt });

  await registerLinkRoutes(app, {
    ipHashSalt: options.deps.ipHashSalt,
    linkUseCase: createLinkUseCase,
    rateLimiter: options.deps.rateLimiter,
  });

  await registerRedirectRoute(app, {
    resolveLinkUseCase,
    clickTracker: options.deps.clickTracker,
    ipHashSalt: options.deps.ipHashSalt,
  });

  await registerStatsRoutes(app, { getLinkStatsUseCase });

  return app;
}
