import { PrismaClient } from "@/generated/prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

function createPrismaClient() {
  // Prisma 7 requires an adapter at runtime. The actual adapter
  // (e.g., PrismaPg) is configured per environment. Cast needed
  // because the generated client's constructor types vary by adapter.
  return new (PrismaClient as any)();
}

export const prisma: InstanceType<typeof PrismaClient> =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
