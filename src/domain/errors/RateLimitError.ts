import { AppError } from "@/domain/errors/AppError";

export class RateLimitError extends AppError {
  public readonly code = "RATE_LIMIT" as const;
}
