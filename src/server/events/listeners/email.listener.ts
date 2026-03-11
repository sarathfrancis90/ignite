import { eventBus } from "@/server/events/event-bus";
import { enqueueImmediateEmail } from "@/server/queues/email.queue";
import { logger } from "@/server/lib/logger";
import type { EventPayload } from "@/server/events/types";
import type { NotificationType } from "@prisma/client";

const childLogger = logger.child({ service: "email-listener" });

function handleNotificationCreated(payload: EventPayload): void {
  void (async () => {
    try {
      const userId = payload.metadata?.userId as string | undefined;
      const notificationType = payload.metadata?.type as NotificationType | undefined;
      const entityType = payload.metadata?.entityType as string | undefined;
      const entityId = payload.metadata?.entityId as string | undefined;

      if (!userId || !notificationType) {
        childLogger.warn({ payload }, "Missing userId or type in notification.created event");
        return;
      }

      await enqueueImmediateEmail({
        notificationId: payload.entityId,
        userId,
        notificationType,
        title: `Notification: ${notificationType.replace(/_/g, " ").toLowerCase()}`,
        body: `You have a new ${notificationType.replace(/_/g, " ").toLowerCase()} notification.`,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
      });
    } catch (error) {
      childLogger.error({ error, event: "notification.created" }, "Failed to enqueue email");
    }
  })();
}

export function registerEmailListeners(): void {
  eventBus.on("notification.created", handleNotificationCreated);
  childLogger.info("Email listeners registered");
}
