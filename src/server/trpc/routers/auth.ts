import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { registerInput, registerUser, AuthServiceError } from "@/server/services/auth.service";

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  register: publicProcedure.input(registerInput).mutation(async ({ input }) => {
    try {
      const user = await registerUser(input);
      return user;
    } catch (error) {
      if (error instanceof AuthServiceError && error.code === "EMAIL_EXISTS") {
        throw new TRPCError({
          code: "CONFLICT",
          message: error.message,
        });
      }
      throw error;
    }
  }),
});
