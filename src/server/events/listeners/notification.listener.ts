import { eventBus } from "@/server/events/event-bus";
import { createNotification } from "@/server/services/notification.service";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { EventPayload } from "@/server/events/types";

const childLogger = logger.child({ service: "notification-listener" });

function handleIdeaSubmitted(payload: EventPayload): void {
  void (async () => {
    try {
      const idea = await prisma.idea.findUnique({
        where: { id: payload.entityId },
        select: {
          title: true,
          campaignId: true,
          campaign: { select: { title: true } },
        },
      });
      if (!idea) return;

      const managers = await prisma.campaignMember.findMany({
        where: { campaignId: idea.campaignId, role: "CAMPAIGN_MANAGER" },
        select: { userId: true },
      });

      for (const manager of managers) {
        if (manager.userId === payload.actor) continue;
        await createNotification({
          userId: manager.userId,
          type: "IDEA_SUBMITTED",
          title: "New idea submitted",
          body: `"${idea.title}" was submitted in campaign "${idea.campaign.title}"`,
          entityType: "idea",
          entityId: payload.entityId,
        });
      }
    } catch (error) {
      childLogger.error({ error, event: "idea.submitted" }, "Failed to create notification");
    }
  })();
}

function handleIdeaStatusChanged(payload: EventPayload): void {
  void (async () => {
    try {
      const idea = await prisma.idea.findUnique({
        where: { id: payload.entityId },
        select: { title: true, contributorId: true, status: true },
      });
      if (!idea) return;

      if (idea.contributorId === payload.actor) return;

      await createNotification({
        userId: idea.contributorId,
        type: "IDEA_STATUS_CHANGED",
        title: "Idea status changed",
        body: `Your idea "${idea.title}" status changed to ${idea.status.replace(/_/g, " ").toLowerCase()}`,
        entityType: "idea",
        entityId: payload.entityId,
      });
    } catch (error) {
      childLogger.error({ error, event: "idea.statusChanged" }, "Failed to create notification");
    }
  })();
}

function handleIdeaTransitioned(payload: EventPayload): void {
  void (async () => {
    try {
      const newStatus = (payload.metadata?.toStatus as string) ?? "";
      if (newStatus !== "HOT") return;

      const idea = await prisma.idea.findUnique({
        where: { id: payload.entityId },
        select: { title: true, contributorId: true },
      });
      if (!idea) return;

      await createNotification({
        userId: idea.contributorId,
        type: "IDEA_HOT_GRADUATION",
        title: "Your idea is HOT!",
        body: `Your idea "${idea.title}" has graduated to HOT status`,
        entityType: "idea",
        entityId: payload.entityId,
      });
    } catch (error) {
      childLogger.error(
        { error, event: "idea.transitioned" },
        "Failed to create HOT graduation notification",
      );
    }
  })();
}

function handleCampaignPhaseChanged(payload: EventPayload): void {
  void (async () => {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: payload.entityId },
        select: { title: true, status: true },
      });
      if (!campaign) return;

      const members = await prisma.campaignMember.findMany({
        where: { campaignId: payload.entityId },
        select: { userId: true },
      });

      const phaseName = campaign.status.replace(/_/g, " ").toLowerCase();

      for (const member of members) {
        if (member.userId === payload.actor) continue;
        await createNotification({
          userId: member.userId,
          type: "CAMPAIGN_PHASE_CHANGED",
          title: "Campaign phase changed",
          body: `Campaign "${campaign.title}" has moved to ${phaseName} phase`,
          entityType: "campaign",
          entityId: payload.entityId,
        });
      }
    } catch (error) {
      childLogger.error({ error, event: "campaign.phaseChanged" }, "Failed to create notification");
    }
  })();
}

function handleRoleAssigned(payload: EventPayload): void {
  void (async () => {
    try {
      const targetUserId = payload.metadata?.targetUserId as string | undefined;
      const roleName = payload.metadata?.role as string | undefined;
      if (!targetUserId || !roleName) return;

      if (targetUserId === payload.actor) return;

      await createNotification({
        userId: targetUserId,
        type: "ROLE_ASSIGNED",
        title: "New role assigned",
        body: `You have been assigned the ${roleName.replace(/_/g, " ").toLowerCase()} role`,
        entityType: payload.entity,
        entityId: payload.entityId,
      });
    } catch (error) {
      childLogger.error({ error, event: "rbac.roleAssigned" }, "Failed to create notification");
    }
  })();
}

export function registerNotificationListeners(): void {
  eventBus.on("idea.submitted", handleIdeaSubmitted);
  eventBus.on("idea.statusChanged", handleIdeaStatusChanged);
  eventBus.on("idea.transitioned", handleIdeaTransitioned);
  eventBus.on("campaign.phaseChanged", handleCampaignPhaseChanged);
  eventBus.on("rbac.roleAssigned", handleRoleAssigned);

  childLogger.info("Notification listeners registered");
}
