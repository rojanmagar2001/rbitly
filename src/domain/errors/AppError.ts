export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL";

export abstract class AppError extends Error {
  public abstract readonly code: AppErrorCode;

  constructor(message: string, options?: { cause?: unknown }) {
    // Pass cause to Error when present (Node 20 supports it)
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
  }
}
