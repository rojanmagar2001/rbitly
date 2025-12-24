import { AppError } from "./AppError";

export class ConflictError extends AppError {
  public readonly code = "CONFLICT" as const;
}
