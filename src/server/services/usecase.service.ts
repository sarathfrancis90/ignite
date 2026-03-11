import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type { UseCaseStatus } from "@prisma/client";
import {
  isValidUseCaseTransition,
  canArchiveUseCase,
  canUnarchiveUseCase,
  STATUS_TIMESTAMP_FIELD,
  USE_CASE_PIPELINE_PHASES,
} from "@/server/lib/state-machines/usecase-transitions";
import type {
  UseCaseListInput,
  UseCaseCreateInput,
  UseCaseUpdateInput,
  UseCaseTaskCreateInput,
  UseCaseTaskUpdateInput,
  UseCaseDiscussionCreateInput,
  UseCaseDiscussionListInput,
  UseCaseAttachmentCreateInput,
  UseCaseInteractionCreateInput,
  UseCaseInteractionListInput,
  UseCaseTaskListInput,
} from "./usecase.schemas";

export {
  useCaseListInput,
  useCaseGetByIdInput,
  useCaseCreateInput,
  useCaseUpdateInput,
  useCaseDeleteInput,
  useCaseTransitionInput,
  useCaseArchiveInput,
  useCaseUnarchiveInput,
  useCasePipelineFunnelInput,
  useCaseTeamAddInput,
  useCaseTeamRemoveInput,
  useCaseTeamListInput,
  useCaseTaskListInput,
  useCaseTaskCreateInput,
  useCaseTaskUpdateInput,
  useCaseTaskDeleteInput,
  useCaseDiscussionListInput,
  useCaseDiscussionCreateInput,
  useCaseDiscussionDeleteInput,
  useCaseAttachmentListInput,
  useCaseAttachmentCreateInput,
  useCaseAttachmentDeleteInput,
  useCaseInteractionListInput,
  useCaseInteractionCreateInput,
  useCaseInteractionDeleteInput,
} from "./usecase.schemas";

const childLogger = logger.child({ service: "usecase" });

export class UseCaseServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "UseCaseServiceError";
  }
}

// ── Use Case CRUD ──────────────────────────────────────────

const useCaseInclude = {
  organization: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count: {
    select: {
      teamMembers: true,
      tasks: true,
      discussions: true,
      attachments: true,
      interactions: true,
    },
  },
} satisfies Prisma.UseCaseInclude;

export async function listUseCases(input: UseCaseListInput) {
  const where: Prisma.UseCaseWhereInput = {};

  if (input.organizationId) {
    where.organizationId = input.organizationId;
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.priority) {
    where.priority = input.priority;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.useCase.findMany({
    where,
    include: useCaseInclude,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const extra = items.pop();
    nextCursor = extra?.id;
  }

  return { items, nextCursor };
}

export async function getUseCaseById(id: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id },
    include: {
      ...useCaseInclude,
      teamMembers: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { assignedAt: "asc" },
      },
    },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  return useCase;
}

export async function createUseCase(input: UseCaseCreateInput, actorId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });

  if (!org) {
    throw new UseCaseServiceError("ORGANIZATION_NOT_FOUND", "Organization not found");
  }

  const useCase = await prisma.useCase.create({
    data: {
      title: input.title,
      description: input.description,
      organizationId: input.organizationId,
      priority: input.priority,
      tags: input.tags,
      estimatedValue: input.estimatedValue,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      createdById: actorId,
    },
    include: useCaseInclude,
  });

  childLogger.info({ useCaseId: useCase.id }, "Use case created");

  eventBus.emit("useCase.created", {
    entity: "useCase",
    entityId: useCase.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { organizationId: input.organizationId },
  });

  return useCase;
}

export async function updateUseCase(input: UseCaseUpdateInput, actorId: string) {
  const existing = await prisma.useCase.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  const useCase = await prisma.useCase.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.estimatedValue !== undefined ? { estimatedValue: input.estimatedValue } : {}),
      ...(input.targetDate !== undefined
        ? { targetDate: input.targetDate ? new Date(input.targetDate) : null }
        : {}),
    },
    include: useCaseInclude,
  });

  childLogger.info({ useCaseId: useCase.id }, "Use case updated");

  eventBus.emit("useCase.updated", {
    entity: "useCase",
    entityId: useCase.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
  });

  return useCase;
}

export async function deleteUseCase(id: string, actorId: string) {
  const existing = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  await prisma.useCase.delete({ where: { id } });

  childLogger.info({ useCaseId: id }, "Use case deleted");

  eventBus.emit("useCase.deleted", {
    entity: "useCase",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
  });

  return { id };
}

// ── Pipeline Transitions ──────────────────────────────────

export async function transitionUseCase(id: string, targetStatus: UseCaseStatus, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  if (!isValidUseCaseTransition(useCase.status, targetStatus)) {
    throw new UseCaseServiceError(
      "INVALID_TRANSITION",
      `Cannot transition from ${useCase.status} to ${targetStatus}`,
    );
  }

  const timestampField = STATUS_TIMESTAMP_FIELD[targetStatus];
  const timestampData: Record<string, Date> = {};
  if (timestampField) {
    timestampData[timestampField] = new Date();
  }

  const updated = await prisma.useCase.update({
    where: { id },
    data: {
      status: targetStatus,
      previousStatus: useCase.status,
      ...timestampData,
    },
    include: useCaseInclude,
  });

  childLogger.info(
    { useCaseId: id, from: useCase.status, to: targetStatus },
    "Use case transitioned",
  );

  eventBus.emit("useCase.transitioned", {
    entity: "useCase",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { from: useCase.status, to: targetStatus },
  });

  return updated;
}

export async function archiveUseCase(id: string, reason: string | undefined, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  if (!canArchiveUseCase(useCase.status)) {
    throw new UseCaseServiceError(
      "CANNOT_ARCHIVE",
      `Cannot archive use case in ${useCase.status} status`,
    );
  }

  const updated = await prisma.useCase.update({
    where: { id },
    data: {
      status: "ARCHIVED",
      previousStatus: useCase.status,
      archiveReason: reason,
      archivedAt: new Date(),
    },
    include: useCaseInclude,
  });

  childLogger.info({ useCaseId: id }, "Use case archived");

  eventBus.emit("useCase.archived", {
    entity: "useCase",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { previousStatus: useCase.status, reason },
  });

  return updated;
}

export async function unarchiveUseCase(id: string, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true, status: true, previousStatus: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  if (!canUnarchiveUseCase(useCase.status)) {
    throw new UseCaseServiceError("CANNOT_UNARCHIVE", "Use case is not archived");
  }

  const restoreTo = useCase.previousStatus ?? "IDENTIFIED";

  const updated = await prisma.useCase.update({
    where: { id },
    data: {
      status: restoreTo,
      previousStatus: "ARCHIVED",
      archiveReason: null,
      archivedAt: null,
    },
    include: useCaseInclude,
  });

  childLogger.info({ useCaseId: id, restoredTo: restoreTo }, "Use case unarchived");

  eventBus.emit("useCase.unarchived", {
    entity: "useCase",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { restoredTo: restoreTo },
  });

  return updated;
}

// ── Pipeline Funnel ──────────────────────────────────────

export async function getPipelineFunnel(organizationId?: string) {
  const where: Prisma.UseCaseWhereInput = {};
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const counts = await prisma.useCase.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
  });

  const funnel = USE_CASE_PIPELINE_PHASES.map((status) => {
    const found = counts.find((c) => c.status === status);
    return {
      status,
      count: found?._count.id ?? 0,
    };
  });

  const total = funnel.reduce((sum, f) => sum + f.count, 0);

  return { funnel, total };
}

// ── Team Members ──────────────────────────────────────────

export async function listTeamMembers(useCaseId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { id: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  return prisma.useCaseTeamMember.findMany({
    where: { useCaseId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { assignedAt: "asc" },
  });
}

export async function addTeamMember(
  useCaseId: string,
  userId: string,
  role: string,
  actorId: string,
) {
  const useCase = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { id: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  const existing = await prisma.useCaseTeamMember.findUnique({
    where: { useCaseId_userId: { useCaseId, userId } },
  });

  if (existing) {
    throw new UseCaseServiceError("ALREADY_MEMBER", "User is already a team member");
  }

  const member = await prisma.useCaseTeamMember.create({
    data: { useCaseId, userId, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  childLogger.info({ useCaseId, userId }, "Team member added");

  eventBus.emit("useCase.teamMemberAdded", {
    entity: "useCase",
    entityId: useCaseId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId, role },
  });

  return member;
}

export async function removeTeamMember(useCaseId: string, userId: string, actorId: string) {
  const member = await prisma.useCaseTeamMember.findUnique({
    where: { useCaseId_userId: { useCaseId, userId } },
  });

  if (!member) {
    throw new UseCaseServiceError("MEMBER_NOT_FOUND", "Team member not found");
  }

  await prisma.useCaseTeamMember.delete({
    where: { useCaseId_userId: { useCaseId, userId } },
  });

  childLogger.info({ useCaseId, userId }, "Team member removed");

  eventBus.emit("useCase.teamMemberRemoved", {
    entity: "useCase",
    entityId: useCaseId,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { userId },
  });

  return { useCaseId, userId };
}

// ── Tasks (Kanban Board) ──────────────────────────────────

export async function listTasks(input: UseCaseTaskListInput) {
  return prisma.useCaseTask.findMany({
    where: { useCaseId: input.useCaseId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });
}

export async function createTask(input: UseCaseTaskCreateInput, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  const maxPosition = await prisma.useCaseTask.aggregate({
    where: { useCaseId: input.useCaseId, status: "TODO" },
    _max: { position: true },
  });

  const task = await prisma.useCaseTask.create({
    data: {
      useCaseId: input.useCaseId,
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      position: (maxPosition._max.position ?? -1) + 1,
      createdById: actorId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  childLogger.info({ taskId: task.id, useCaseId: input.useCaseId }, "Task created");

  eventBus.emit("useCase.taskCreated", {
    entity: "useCaseTask",
    entityId: task.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: input.useCaseId },
  });

  return task;
}

export async function updateTask(input: UseCaseTaskUpdateInput, actorId: string) {
  const existing = await prisma.useCaseTask.findUnique({
    where: { id: input.id },
    select: { id: true, useCaseId: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("TASK_NOT_FOUND", "Task not found");
  }

  const task = await prisma.useCaseTask.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
        : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  childLogger.info({ taskId: task.id }, "Task updated");

  eventBus.emit("useCase.taskUpdated", {
    entity: "useCaseTask",
    entityId: task.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: existing.useCaseId },
  });

  return task;
}

export async function deleteTask(id: string, _actorId: string) {
  const existing = await prisma.useCaseTask.findUnique({
    where: { id },
    select: { id: true, useCaseId: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("TASK_NOT_FOUND", "Task not found");
  }

  await prisma.useCaseTask.delete({ where: { id } });

  childLogger.info({ taskId: id }, "Task deleted");

  return { id };
}

// ── Discussions ──────────────────────────────────────────

export async function listDiscussions(input: UseCaseDiscussionListInput) {
  const items = await prisma.useCaseDiscussion.findMany({
    where: { useCaseId: input.useCaseId },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const extra = items.pop();
    nextCursor = extra?.id;
  }

  return { items, nextCursor };
}

export async function createDiscussion(input: UseCaseDiscussionCreateInput, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  const discussion = await prisma.useCaseDiscussion.create({
    data: {
      useCaseId: input.useCaseId,
      authorId: actorId,
      content: input.content,
      isInternal: input.isInternal,
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  childLogger.info({ discussionId: discussion.id }, "Discussion created");

  eventBus.emit("useCase.discussionCreated", {
    entity: "useCaseDiscussion",
    entityId: discussion.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: input.useCaseId },
  });

  return discussion;
}

export async function deleteDiscussion(id: string, actorId: string) {
  const existing = await prisma.useCaseDiscussion.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("DISCUSSION_NOT_FOUND", "Discussion not found");
  }

  if (existing.authorId !== actorId) {
    throw new UseCaseServiceError("NOT_AUTHOR", "Only the author can delete this discussion");
  }

  await prisma.useCaseDiscussion.delete({ where: { id } });

  childLogger.info({ discussionId: id }, "Discussion deleted");

  return { id };
}

// ── Attachments ─────────────────────────────────────────

export async function listAttachments(useCaseId: string) {
  return prisma.useCaseAttachment.findMany({
    where: { useCaseId },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAttachment(input: UseCaseAttachmentCreateInput, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  const attachment = await prisma.useCaseAttachment.create({
    data: {
      useCaseId: input.useCaseId,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedById: actorId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ attachmentId: attachment.id }, "Attachment added");

  eventBus.emit("useCase.attachmentAdded", {
    entity: "useCaseAttachment",
    entityId: attachment.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: input.useCaseId },
  });

  return attachment;
}

export async function deleteAttachment(id: string, _actorId: string) {
  const existing = await prisma.useCaseAttachment.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("ATTACHMENT_NOT_FOUND", "Attachment not found");
  }

  await prisma.useCaseAttachment.delete({ where: { id } });

  childLogger.info({ attachmentId: id }, "Attachment deleted");

  return { id };
}

// ── Interactions Log ────────────────────────────────────

export async function listInteractions(input: UseCaseInteractionListInput) {
  const where: Prisma.UseCaseInteractionWhereInput = {
    useCaseId: input.useCaseId,
  };

  if (input.type) {
    where.type = input.type;
  }

  const items = await prisma.useCaseInteraction.findMany({
    where,
    include: {
      recordedBy: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { occurredAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const extra = items.pop();
    nextCursor = extra?.id;
  }

  return { items, nextCursor };
}

export async function createInteraction(input: UseCaseInteractionCreateInput, actorId: string) {
  const useCase = await prisma.useCase.findUnique({
    where: { id: input.useCaseId },
    select: { id: true },
  });

  if (!useCase) {
    throw new UseCaseServiceError("USE_CASE_NOT_FOUND", "Use case not found");
  }

  const interaction = await prisma.useCaseInteraction.create({
    data: {
      useCaseId: input.useCaseId,
      type: input.type,
      summary: input.summary,
      details: input.details,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      recordedById: actorId,
      contactId: input.contactId,
    },
    include: {
      recordedBy: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  childLogger.info({ interactionId: interaction.id }, "Interaction logged");

  eventBus.emit("useCase.interactionLogged", {
    entity: "useCaseInteraction",
    entityId: interaction.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { useCaseId: input.useCaseId, type: input.type },
  });

  return interaction;
}

export async function deleteInteraction(id: string, _actorId: string) {
  const existing = await prisma.useCaseInteraction.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new UseCaseServiceError("INTERACTION_NOT_FOUND", "Interaction not found");
  }

  await prisma.useCaseInteraction.delete({ where: { id } });

  childLogger.info({ interactionId: id }, "Interaction deleted");

  return { id };
}
