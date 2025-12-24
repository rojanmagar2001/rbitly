import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, type AppErrorCode } from "@/domain/errors/AppError";
import { ValidationError } from "@/domain/errors/ValidationError";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

const APP_ERROR_CODES: ReadonlySet<AppErrorCode> = new Set([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMIT",
  "INTERNAL",
  "UNAUTHORIZED",
]);

function toValidationError(err: ZodError): ValidationError {
  const msg = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
  return new ValidationError(msg, { cause: err });
}

function isAppErrorLike(err: unknown): err is { code: AppErrorCode; message: string } {
  if (typeof err !== "object" || err === null) return false;
  if (!("code" in err) || !("message" in err)) return false;
  const code = (err as { code?: unknown }).code;
  const message = (err as { message?: unknown }).message;
  return (
    typeof code === "string" &&
    APP_ERROR_CODES.has(code as AppErrorCode) &&
    typeof message === "string"
  );
}

function statusForAppError(code: AppErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RATE_LIMIT":
      return 429;
    case "UNAUTHORIZED":
      return 401;
    default:
      return 500;
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, _req: FastifyRequest, reply: FastifyReply): void => {
    // Zod validation errors
    if (err instanceof ZodError) {
      const ve = toValidationError(err);
      void reply
        .status(400)
        .send({ error: { code: ve.code, message: ve.message } } satisfies ErrorResponse);
      return;
    }

    // Domain/app errors (preferred)
    if (err instanceof AppError) {
      const status = statusForAppError(err.code);
      void reply.status(status).send({
        error: { code: err.code, message: err.message },
      } satisfies ErrorResponse);
      return;
    }

    // Robust fallback: accept "AppError-like" objects
    if (isAppErrorLike(err)) {
      const status = statusForAppError(err.code);
      void reply.status(status).send({
        error: { code: err.code, message: err.message },
      } satisfies ErrorResponse);
      return;
    }

    // Default: avoid leaking internals
    app.log.error({ err }, "Unhandled error");
    void reply.status(500).send({
      error: { code: "INTERNAL", message: "Internal server error." },
    } satisfies ErrorResponse);
  });
}
