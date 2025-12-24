import { createApp } from "./interfaces/http/createApp";

function parsePort(value: string | undefined): number {
  if (!value) return 3000;

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return 3000;
  return port;
}

async function main(): Promise<void> {
  const app = await createApp({ logger: true });

  const port = parsePort(process.env["PORT"]);
  const host = process.env["HOST"] ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exitCode = 1;
  }
}

void main();
