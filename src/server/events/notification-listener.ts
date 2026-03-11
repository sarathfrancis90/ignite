import { eventBus } from "./event-bus";
import type { EventPayload } from "./types";
import { prisma } from "@/server/lib/prisma";
import {
  createNotification,
  createBulkNotifications,
} from "@/server/services/notification.service";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ listener: "notification" });

/**
 * Register all notification event listeners on the EventBus.
 * Called once at server startup.
 */
export function registerNotificationListeners(): void {
  eventBus.on("idea.submitted", handleIdeaSubmitted);
  eventBus.on("idea.statusChanged", handleIdeaStatusChanged);
  eventBus.on("campaign.phaseChanged", handleCampaignPhaseChanged);
  eventBus.on("comment.created", handleCommentCreated);
  eventBus.on("comment.mentioned", handleCommentMentioned);
  eventBus.on("rbac.roleAssigned", handleRoleAssigned);
  eventBus.on("rbac.roleRemoved", handleRoleRemoved);

  childLogger.info("Notification listeners registered");
}

async function handleIdeaSubmitted(payload: EventPayload): Promise<void> {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: payload.entityId },
      select: {
        id: true,
        title: true,
        campaignId: true,
        campaign: { select: { title: true } },
      },
    });

    if (!idea) return;

    // Notify campaign managers about new idea submission
    const managers = await prisma.campaignMember.findMany({
      where: { campaignId: idea.campaignId, role: "CAMPAIGN_MANAGER" },
      select: { userId: true },
    });

    const managerIds = managers.map((m) => m.userId).filter((id) => id !== payload.actor);

    if (managerIds.length > 0) {
      await createBulkNotifications(managerIds, {
        type: "IDEA_SUBMITTED",
        title: "New idea submitted",
        body: `"${idea.title}" was submitted in ${idea.campaign.title}`,
        entityType: "idea",
        entityId: idea.id,
      });
    }
  } catch (error) {
    childLogger.error({ err: error, event: "idea.submitted" }, "Failed to handle idea.submitted");
  }
}

async function handleIdeaStatusChanged(payload: EventPayload): Promise<void> {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: payload.entityId },
      select: {
        id: true,
        title: true,
        status: true,
        contributorId: true,
        coAuthors: { select: { userId: true } },
      },
    });

    if (!idea) return;

    const recipientIds = [idea.contributorId, ...idea.coAuthors.map((ca) => ca.userId)].filter(
      (id) => id !== payload.actor,
    );

    const isHotGraduation = idea.status === "HOT";
    const type = isHotGraduation ? "IDEA_HOT_GRADUATION" : "IDEA_STATUS_CHANGED";
    const title = isHotGraduation ? "Your idea is HOT!" : "Idea status changed";
    const statusLabel = idea.status.replace(/_/g, " ").toLowerCase();
    const body = isHotGraduation
      ? `"${idea.title}" has graduated to HOT status`
      : `"${idea.title}" status changed to ${statusLabel}`;

    if (recipientIds.length > 0) {
      await createBulkNotifications(recipientIds, {
        type,
        title,
        body,
        entityType: "idea",
        entityId: idea.id,
      });
    }
  } catch (error) {
    childLogger.error(
      { err: error, event: "idea.statusChanged" },
      "Failed to handle idea.statusChanged",
    );
  }
}

async function handleCampaignPhaseChanged(payload: EventPayload): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: payload.entityId },
      select: {
        id: true,
        title: true,
        status: true,
        members: { select: { userId: true } },
      },
    });

    if (!campaign) return;

    const recipientIds = campaign.members.map((m) => m.userId).filter((id) => id !== payload.actor);

    const phaseLabel = campaign.status.replace(/_/g, " ").toLowerCase();

    if (recipientIds.length > 0) {
      await createBulkNotifications(recipientIds, {
        type: "CAMPAIGN_PHASE_CHANGED",
        title: "Campaign phase changed",
        body: `"${campaign.title}" moved to ${phaseLabel} phase`,
        entityType: "campaign",
        entityId: campaign.id,
      });
    }
  } catch (error) {
    childLogger.error(
      { err: error, event: "campaign.phaseChanged" },
      "Failed to handle campaign.phaseChanged",
    );
  }
}

async function handleCommentCreated(payload: EventPayload): Promise<void> {
  try {
    const ideaId = payload.metadata?.ideaId as string | undefined;
    if (!ideaId) return;

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: {
        id: true,
        title: true,
        contributorId: true,
        coAuthors: { select: { userId: true } },
      },
    });

    if (!idea) return;

    // Notify idea owner and co-authors about new comment
    const recipientIds = [idea.contributorId, ...idea.coAuthors.map((ca) => ca.userId)].filter(
      (id) => id !== payload.actor,
    );

    if (recipientIds.length > 0) {
      await createBulkNotifications(recipientIds, {
        type: "COMMENT_ON_FOLLOWED",
        title: "New comment on your idea",
        body: `Someone commented on "${idea.title}"`,
        entityType: "idea",
        entityId: idea.id,
      });
    }
  } catch (error) {
    childLogger.error({ err: error, event: "comment.created" }, "Failed to handle comment.created");
  }
}

async function handleCommentMentioned(payload: EventPayload): Promise<void> {
  try {
    const mentionedUserId = payload.metadata?.mentionedUserId as string | undefined;
    if (!mentionedUserId) return;

    const ideaId = payload.metadata?.ideaId as string | undefined;
    const idea = ideaId
      ? await prisma.idea.findUnique({
          where: { id: ideaId },
          select: { id: true, title: true },
        })
      : null;

    const ideaTitle = idea?.title ?? "an idea";

    await createNotification({
      userId: mentionedUserId,
      type: "COMMENT_MENTION",
      title: "You were mentioned in a comment",
      body: `You were mentioned in a comment on "${ideaTitle}"`,
      entityType: "comment",
      entityId: payload.entityId,
    });
  } catch (error) {
    childLogger.error(
      { err: error, event: "comment.mentioned" },
      "Failed to handle comment.mentioned",
    );
  }
}

async function handleRoleAssigned(payload: EventPayload): Promise<void> {
  try {
    const targetUserId = payload.metadata?.userId as string | undefined;
    const role = payload.metadata?.role as string | undefined;
    if (!targetUserId || !role) return;

    const roleLabel = role.replace(/_/g, " ").toLowerCase();

    await createNotification({
      userId: targetUserId,
      type: "ROLE_ASSIGNED",
      title: "Role assigned",
      body: `You have been assigned the ${roleLabel} role`,
      entityType: payload.entity,
      entityId: payload.entityId,
    });
  } catch (error) {
    childLogger.error(
      { err: error, event: "rbac.roleAssigned" },
      "Failed to handle rbac.roleAssigned",
    );
  }
}

async function handleRoleRemoved(payload: EventPayload): Promise<void> {
  try {
    const targetUserId = payload.metadata?.userId as string | undefined;
    const role = payload.metadata?.role as string | undefined;
    if (!targetUserId || !role) return;

    const roleLabel = role.replace(/_/g, " ").toLowerCase();

    await createNotification({
      userId: targetUserId,
      type: "ROLE_REMOVED",
      title: "Role removed",
      body: `Your ${roleLabel} role has been removed`,
      entityType: payload.entity,
      entityId: payload.entityId,
    });
  } catch (error) {
    childLogger.error(
      { err: error, event: "rbac.roleRemoved" },
      "Failed to handle rbac.roleRemoved",
    );
  }
}
