export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL";

export abstract class AppError extends Error {
  public abstract readonly code: AppErrorCode;

  constructor(message: string, _options?: { cause?: unknown }) {
    // Pass cause to Error when present (Node 20 supports it)
    super(message);
    this.name = this.constructor.name;
  }
}
