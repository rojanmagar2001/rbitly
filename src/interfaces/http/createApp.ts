/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

 
 
 

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
import cookie from "@fastify/cookie";
import { createHttpMetrics } from "@/infrastructure/metrics/httpMetrics";
import { registerMetricsRoute } from "./routes/metrics";

export type CreateAppOptions = {
  logger?: boolean;
  deps: AppDeps;
};

export async function createApp(options: CreateAppOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? true,
  });

  // Cookies (signed)
  await app.register(cookie, {
    secret: options.deps.cookieSecret,
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

  // Metrics instrumentation
  const httpMetrics = createHttpMetrics(options.deps.metricsRegistry);

  app.addHook("onRequest", async (req) => {
    const route = req.routeOptions?.url ?? "unknown";
    (req as any).__metricsRoute = route;
    (req as any).__startHr = process.hrtime.bigint();
    httpMetrics.httpInFlight.inc({ method: req.method, route });
  });

  app.addHook("onResponse", async (req, reply) => {
    const route = (req as any).__metricsRoute ?? "unknown";
    const start = (req as any).__startHr as bigint | undefined;
    if (start) {
      const diffNs = process.hrtime.bigint() - start;
      const seconds = Number(diffNs) / 1_000_000_000;
      httpMetrics.httpRequestDuration.observe(
        { method: req.method, route, status_code: String(reply.statusCode) },
        seconds,
      );
    }
    httpMetrics.httpInFlight.dec({ method: req.method, route });
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

  await registerMetricsRoute(app, {
    registry: options.deps.metricsRegistry,
    metricsToken: options.deps.metricsToken,
  });

  return app;
}
