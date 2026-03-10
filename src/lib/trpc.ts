import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "./prisma";

export interface TRPCContext {
  prisma: typeof prisma;
  userId: string | null;
}

export async function createContext(): Promise<TRPCContext> {
  return {
    prisma,
    userId: null,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
