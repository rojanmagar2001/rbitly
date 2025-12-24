import { AppError } from "@/domain/errors/AppError";

export class UnauthorizedError extends AppError {
  public readonly code = "UNAUTHORIZED" as const;
}
