import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  notificationListInput,
  notificationMarkReadInput,
  notificationMarkAllReadInput,
  notificationDeleteInput,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  NotificationServiceError,
} from "@/server/services/notification.service";

function handleNotificationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof NotificationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "FORBIDDEN"> = {
      NOTIFICATION_NOT_FOUND: "NOT_FOUND",
      NOT_AUTHORIZED: "FORBIDDEN",
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
      return getUnreadCount(ctx.session.user.id);
    }),

  markAsRead: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationMarkReadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await markAsRead(input.id, ctx.session.user.id);
      } catch (error) {
        handleNotificationError(error);
      }
    }),

  markAllAsRead: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationMarkAllReadInput)
    .mutation(async ({ ctx, input }) => {
      return markAllAsRead(ctx.session.user.id, input);
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.NOTIFICATION_READ_OWN))
    .input(notificationDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteNotification(input.id, ctx.session.user.id);
      } catch (error) {
        handleNotificationError(error);
      }
    }),
});
