import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  notificationListInput,
  notificationMarkReadInput,
  notificationMarkAllReadInput,
} from "@/server/services/notification.schemas";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  NotificationServiceError,
} from "@/server/services/notification.service";

function handleNotificationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof NotificationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      NOT_FOUND: "NOT_FOUND",
      INVALID_INPUT: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationListInput)
    .query(async ({ ctx, input }) => {
      return listNotifications(ctx.session.user.id, input);
    }),

  unreadCount: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .query(async ({ ctx }) => {
      const count = await getUnreadCount(ctx.session.user.id);
      return { count };
    }),

  markAsRead: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationMarkReadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await markAsRead(ctx.session.user.id, input.id);
      } catch (error) {
        handleNotificationError(error);
      }
    }),

  markAllAsRead: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationMarkAllReadInput)
    .mutation(async ({ ctx }) => {
      return markAllAsRead(ctx.session.user.id);
    }),
});
