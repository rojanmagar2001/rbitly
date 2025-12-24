export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL";

export abstract class AppError extends Error {
  public abstract readonly code: AppErrorCode;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    if (options!.cause) {
      // Node 16+ supports cause, but TS typing depends on lib; keep explicit field
      (this as unknown as { cause: unknown }).cause = options?.cause;
    }
  }
}
