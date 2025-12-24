import { AppError } from "./AppError";

export class InternalError extends AppError {
  public readonly code = "INTERNAL" as const;
}
