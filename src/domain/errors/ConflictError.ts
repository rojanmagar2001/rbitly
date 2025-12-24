import { AppError } from "@/domain/errors/AppError";

export class ConflictError extends AppError {
  public readonly code = "CONFLICT" as const;
}
