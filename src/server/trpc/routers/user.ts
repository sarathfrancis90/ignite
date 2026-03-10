import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  updateProfileInput,
  getUserProfile,
  updateUserProfile,
  UserServiceError,
} from "@/server/services/user.service";

// TODO(story-1.4): Add requirePermission middleware to all procedures
export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserProfile(ctx.session.user.id);
    } catch (error) {
      if (error instanceof UserServiceError && error.code === "USER_NOT_FOUND") {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      }
      throw error;
    }
  }),

  updateProfile: protectedProcedure.input(updateProfileInput).mutation(async ({ ctx, input }) => {
    try {
      return await updateUserProfile(ctx.session.user.id, input);
    } catch (error) {
      if (error instanceof UserServiceError && error.code === "USER_NOT_FOUND") {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      }
      throw error;
    }
  }),
});
