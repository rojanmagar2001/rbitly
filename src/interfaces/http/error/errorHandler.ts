import { AppError } from "@/domain/errors/AppError";
import { ValidationError } from "@/domain/errors/ValidationError";
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

function toValidationError(err: ZodError): ValidationError {
  const msg = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
  return new ValidationError(msg, { cause: err });
}

function statusForAppError(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RATE_LIMIT":
      return 429;
    default:
      return 500;
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, _req: FastifyRequest, reply: FastifyReply): void => {
    const appErr =
      err instanceof ZodError ? toValidationError(err) : err instanceof AppError ? err : null;

    if (appErr) {
      const status = statusForAppError(appErr.code);
      const body: ErrorResponse = {
        error: { code: appErr.code, message: appErr.message },
      };
      void reply.status(status).send(body);
      return;
    }

    // Default: avoid leaking internals
    app.log.error({ err }, "Unhandled error");
    void reply.status(500).send({
      error: { code: "INTERNAL", message: "Internal server error." },
    } satisfies ErrorResponse);
  });
}
