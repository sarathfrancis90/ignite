import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/server/lib/auth";
import { logger } from "@/server/lib/logger";

export interface TRPCContext {
  session: Session | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();
  return { session };
}

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  logger.debug({ userId: ctx.session.user.id }, "Authenticated request");

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
