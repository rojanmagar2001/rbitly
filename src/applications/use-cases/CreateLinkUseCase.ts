import type { LinkRepository } from "@/domain/repositories/LinkRepository";
import { randomBytes } from "node:crypto";
import type { CreateLinkDTO } from "../dtos/CreateLinkDTO";
import type { LinkDTO } from "../dtos/LinkDTO";
import { ConflictError } from "@/domain/errors/ConflictError";
import { InternalError } from "@/domain/errors/InternalError";

function base62FromBytes(buf: Buffer): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (const b of buf) out += alphabet[b % alphabet.length];
  return out;
}

function generateCode(length: number): string {
  // length chars, 1 byte each char
  return base62FromBytes(randomBytes(length));
}

function isUniqueConstraintError(err: unknown): boolean {
  // Prisma throws known errors, but we keep this decoupled from Prisma types.
  // We rely on "code" field commonly present on Prisma errors: P2002.
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export class CreateLinkUseCase {
  constructor(
    private readonly repo: LinkRepository,
    private opts: { ipHashSalt: string; codeLength?: number; maxRetries?: number },
  ) {}

  async execute(input: CreateLinkDTO): Promise<LinkDTO> {
    const codeLength = input.customAlias ? input.customAlias.length : (this.opts.codeLength ?? 7);
    const maxRetries = this.opts.maxRetries ?? 5;

    // If custom alias is provided, use it as the code (single attempt).
    if (input.customAlias) {
      try {
        const link = await this.repo.create({
          code: input.customAlias,
          originalUrl: input.url,
          expiresAt: input.expiresAt,
          customAlias: input.customAlias,
          createdByIpHash: input.requesterIp,
        });

        return { code: link.code, originalUrl: link.originalUrl, expiresAt: link.expiresAt };
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new ConflictError("Custom alias is already in use.", {
            cause: err,
          });
        }
        throw new InternalError("Failed to create link.", { cause: err });
      }
    }

    // Otherwise generate a random code and retry on collisions.
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const code = generateCode(codeLength);

      try {
        const link = await this.repo.create({
          code,
          originalUrl: input.url,
          expiresAt: input.expiresAt,
          customAlias: input.customAlias,
          createdByIpHash: input.requesterIp,
        });

        return { code: link.code, originalUrl: link.originalUrl, expiresAt: link.expiresAt };
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          continue;
        }

        throw new InternalError("Failed to create link.", { cause: err });
      }
    }

    throw new ConflictError("Could not allocate a unique short code. Please retry.");
  }
}
