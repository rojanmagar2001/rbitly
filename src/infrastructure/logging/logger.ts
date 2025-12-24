/* eslint-disable @typescript-eslint/no-explicit-any */
 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

 
 
 

import type { LoggerOptions } from "pino";
import { pinoRedactPaths } from "@/infrastructure/logging/redact";

export function buildLoggerOptions(env: string | undefined): LoggerOptions {
  const isProd = env === "production";

  return {
    level: (process.env["LOG_LEVEL"] as any) || (isProd ? "info" : "debug"),
    redact: {
      paths: pinoRedactPaths,
      censor: "[REDACTED]",
    },
    // Keep logs small in dev, structured in prod
    transport: isProd
      ? (undefined as any)
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
  };
}
