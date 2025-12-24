import { AppError } from "@/domain/errors/AppError";

export class ValidationError extends AppError {
  public readonly code = "VALIDATION_ERROR" as const;
}
