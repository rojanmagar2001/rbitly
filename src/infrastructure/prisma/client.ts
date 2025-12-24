import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function createPrismaClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"]!;
  // We'll add logging + metrics hooks later
  const adapter = new PrismaPg({
    connectionString,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  return prisma;
}
