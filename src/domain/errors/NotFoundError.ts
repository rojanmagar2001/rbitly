import { AppError } from "./AppError";

export class NotFoundError extends AppError {
  public readonly code = "NOT_FOUND" as const;
}
