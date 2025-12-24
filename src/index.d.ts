import "@fastify/view";

declare module "fastify" {
  interface FastifyReply {
    view(page: string, data?: object): FastifyReply;
  }
}
