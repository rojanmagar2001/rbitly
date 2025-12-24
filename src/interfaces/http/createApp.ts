import fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoute } from "./routes/health";

export type CreateAppOptions = {
  logger?: boolean;
};

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? true,
  });

  await registerHealthRoute(app);

  return app;
}
