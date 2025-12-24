import { AppError } from "@/domain/errors/AppError";

export class InternalError extends AppError {
  public readonly code = "INTERNAL" as const;
}
