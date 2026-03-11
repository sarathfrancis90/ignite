import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listUseCases,
  getUseCaseById,
  createUseCase,
  updateUseCase,
  deleteUseCase,
  transitionUseCase,
  archiveUseCase,
  unarchiveUseCase,
  getPipelineFunnel,
  addTeamMember,
  removeTeamMember,
  createTask,
  updateTask,
  deleteTask,
  createDiscussion,
  deleteDiscussion,
  createInteraction,
  UseCaseServiceError,
} from "./usecase.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    useCase: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    useCaseTeamMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    useCaseTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    useCaseDiscussion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    useCaseAttachment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    useCaseInteraction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const ucFindUnique = prisma.useCase.findUnique as unknown as Mock;
const ucFindMany = prisma.useCase.findMany as unknown as Mock;
const ucCreate = prisma.useCase.create as unknown as Mock;
const ucUpdate = prisma.useCase.update as unknown as Mock;
const ucDelete = prisma.useCase.delete as unknown as Mock;
const ucGroupBy = prisma.useCase.groupBy as unknown as Mock;
const orgFindUnique = prisma.organization.findUnique as unknown as Mock;
const teamFindUnique = prisma.useCaseTeamMember.findUnique as unknown as Mock;
const teamCreate = prisma.useCaseTeamMember.create as unknown as Mock;
const teamDelete = prisma.useCaseTeamMember.delete as unknown as Mock;
const taskFindUnique = prisma.useCaseTask.findUnique as unknown as Mock;
const taskCreate = prisma.useCaseTask.create as unknown as Mock;
const taskUpdate = prisma.useCaseTask.update as unknown as Mock;
const taskDelete = prisma.useCaseTask.delete as unknown as Mock;
const taskAggregate = prisma.useCaseTask.aggregate as unknown as Mock;
const discussionFindUnique = prisma.useCaseDiscussion.findUnique as unknown as Mock;
const discussionCreate = prisma.useCaseDiscussion.create as unknown as Mock;
const discussionDelete = prisma.useCaseDiscussion.delete as unknown as Mock;
const interactionCreate = prisma.useCaseInteraction.create as unknown as Mock;

const mockUseCase = {
  id: "uc-1",
  title: "AI Supply Chain",
  description: "Optimize supply chain with AI",
  status: "IDENTIFIED",
  previousStatus: null,
  priority: "HIGH",
  organizationId: "org-1",
  createdById: "user-1",
  tags: ["AI", "logistics"],
  estimatedValue: "$500K",
  targetDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  organization: { id: "org-1", name: "Acme Corp" },
  createdBy: { id: "user-1", name: "John", email: "john@test.com" },
  _count: { teamMembers: 0, tasks: 0, discussions: 0, attachments: 0, interactions: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usecase.service", () => {
  describe("listUseCases", () => {
    it("returns paginated use cases", async () => {
      ucFindMany.mockResolvedValue([mockUseCase]);

      const result = await listUseCases({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
      expect(ucFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 21 }));
    });

    it("filters by organizationId", async () => {
      ucFindMany.mockResolvedValue([]);

      await listUseCases({ limit: 20, organizationId: "org-1" });

      expect(ucFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
        }),
      );
    });

    it("filters by status", async () => {
      ucFindMany.mockResolvedValue([]);

      await listUseCases({ limit: 20, status: "PILOT" });

      expect(ucFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "PILOT" }),
        }),
      );
    });
  });

  describe("getUseCaseById", () => {
    it("returns use case when found", async () => {
      ucFindUnique.mockResolvedValue({ ...mockUseCase, teamMembers: [] });

      const result = await getUseCaseById("uc-1");

      expect(result.id).toBe("uc-1");
    });

    it("throws USE_CASE_NOT_FOUND when not found", async () => {
      ucFindUnique.mockResolvedValue(null);

      await expect(getUseCaseById("uc-999")).rejects.toThrow(UseCaseServiceError);
      await expect(getUseCaseById("uc-999")).rejects.toThrow("Use case not found");
    });
  });

  describe("createUseCase", () => {
    it("creates use case and emits event", async () => {
      orgFindUnique.mockResolvedValue({ id: "org-1" });
      ucCreate.mockResolvedValue(mockUseCase);

      const result = await createUseCase(
        {
          title: "AI Supply Chain",
          organizationId: "org-1",
          priority: "HIGH",
          tags: ["AI"],
        },
        "user-1",
      );

      expect(result.id).toBe("uc-1");
      expect(ucCreate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.created",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });

    it("throws if organization not found", async () => {
      orgFindUnique.mockResolvedValue(null);

      await expect(
        createUseCase(
          { title: "Test", organizationId: "org-bad", priority: "MEDIUM", tags: [] },
          "user-1",
        ),
      ).rejects.toThrow("Organization not found");
    });
  });

  describe("updateUseCase", () => {
    it("updates and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      ucUpdate.mockResolvedValue({ ...mockUseCase, title: "Updated" });

      const result = await updateUseCase({ id: "uc-1", title: "Updated" }, "user-1");

      expect(result.title).toBe("Updated");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.updated",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });

    it("throws if not found", async () => {
      ucFindUnique.mockResolvedValue(null);

      await expect(updateUseCase({ id: "uc-bad" }, "user-1")).rejects.toThrow("Use case not found");
    });
  });

  describe("deleteUseCase", () => {
    it("deletes and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      ucDelete.mockResolvedValue({ id: "uc-1" });

      const result = await deleteUseCase("uc-1", "user-1");

      expect(result.id).toBe("uc-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.deleted",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });
  });

  describe("transitionUseCase", () => {
    it("transitions IDENTIFIED -> QUALIFICATION", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1", status: "IDENTIFIED" });
      ucUpdate.mockResolvedValue({ ...mockUseCase, status: "QUALIFICATION" });

      const result = await transitionUseCase("uc-1", "QUALIFICATION", "user-1");

      expect(result.status).toBe("QUALIFICATION");
      expect(ucUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "QUALIFICATION",
            previousStatus: "IDENTIFIED",
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.transitioned",
        expect.objectContaining({
          metadata: expect.objectContaining({ from: "IDENTIFIED", to: "QUALIFICATION" }),
        }),
      );
    });

    it("rejects invalid transition IDENTIFIED -> PILOT", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1", status: "IDENTIFIED" });

      await expect(transitionUseCase("uc-1", "PILOT", "user-1")).rejects.toThrow(
        "Cannot transition from IDENTIFIED to PILOT",
      );
    });

    it("throws if not found", async () => {
      ucFindUnique.mockResolvedValue(null);

      await expect(transitionUseCase("uc-bad", "QUALIFICATION", "user-1")).rejects.toThrow(
        "Use case not found",
      );
    });
  });

  describe("archiveUseCase", () => {
    it("archives from IDENTIFIED", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1", status: "IDENTIFIED" });
      ucUpdate.mockResolvedValue({ ...mockUseCase, status: "ARCHIVED" });

      const result = await archiveUseCase("uc-1", "No longer relevant", "user-1");

      expect(result.status).toBe("ARCHIVED");
      expect(eventBus.emit).toHaveBeenCalledWith("useCase.archived", expect.any(Object));
    });

    it("rejects archiving from PARTNERSHIP", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1", status: "PARTNERSHIP" });

      await expect(archiveUseCase("uc-1", undefined, "user-1")).rejects.toThrow(
        "Cannot archive use case in PARTNERSHIP status",
      );
    });
  });

  describe("unarchiveUseCase", () => {
    it("restores to previous status", async () => {
      ucFindUnique.mockResolvedValue({
        id: "uc-1",
        status: "ARCHIVED",
        previousStatus: "QUALIFICATION",
      });
      ucUpdate.mockResolvedValue({ ...mockUseCase, status: "QUALIFICATION" });

      const result = await unarchiveUseCase("uc-1", "user-1");

      expect(result.status).toBe("QUALIFICATION");
      expect(ucUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "QUALIFICATION" }),
        }),
      );
    });

    it("restores to IDENTIFIED if no previous status", async () => {
      ucFindUnique.mockResolvedValue({
        id: "uc-1",
        status: "ARCHIVED",
        previousStatus: null,
      });
      ucUpdate.mockResolvedValue({ ...mockUseCase, status: "IDENTIFIED" });

      await unarchiveUseCase("uc-1", "user-1");

      expect(ucUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "IDENTIFIED" }),
        }),
      );
    });

    it("rejects unarchiving non-archived use case", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1", status: "PILOT", previousStatus: null });

      await expect(unarchiveUseCase("uc-1", "user-1")).rejects.toThrow("Use case is not archived");
    });
  });

  describe("getPipelineFunnel", () => {
    it("returns counts for each pipeline phase", async () => {
      ucGroupBy.mockResolvedValue([
        { status: "IDENTIFIED", _count: { id: 5 } },
        { status: "QUALIFICATION", _count: { id: 3 } },
        { status: "EVALUATION", _count: { id: 2 } },
      ]);

      const result = await getPipelineFunnel();

      expect(result.funnel).toHaveLength(5);
      expect(result.funnel[0]).toEqual({ status: "IDENTIFIED", count: 5 });
      expect(result.funnel[1]).toEqual({ status: "QUALIFICATION", count: 3 });
      expect(result.funnel[2]).toEqual({ status: "EVALUATION", count: 2 });
      expect(result.funnel[3]).toEqual({ status: "PILOT", count: 0 });
      expect(result.funnel[4]).toEqual({ status: "PARTNERSHIP", count: 0 });
      expect(result.total).toBe(10);
    });
  });

  describe("team members", () => {
    it("adds a team member", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      teamFindUnique.mockResolvedValue(null);
      teamCreate.mockResolvedValue({
        id: "tm-1",
        useCaseId: "uc-1",
        userId: "user-2",
        role: "member",
        user: { id: "user-2", name: "Jane", email: "jane@test.com" },
      });

      const result = await addTeamMember("uc-1", "user-2", "member", "user-1");

      expect(result.userId).toBe("user-2");
      expect(eventBus.emit).toHaveBeenCalledWith("useCase.teamMemberAdded", expect.any(Object));
    });

    it("rejects duplicate team member", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      teamFindUnique.mockResolvedValue({ id: "tm-existing" });

      await expect(addTeamMember("uc-1", "user-2", "member", "user-1")).rejects.toThrow(
        "User is already a team member",
      );
    });

    it("removes a team member", async () => {
      teamFindUnique.mockResolvedValue({ id: "tm-1" });
      teamDelete.mockResolvedValue({ id: "tm-1" });

      const result = await removeTeamMember("uc-1", "user-2", "user-1");

      expect(result.userId).toBe("user-2");
      expect(eventBus.emit).toHaveBeenCalledWith("useCase.teamMemberRemoved", expect.any(Object));
    });
  });

  describe("tasks", () => {
    it("creates a task", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      taskAggregate.mockResolvedValue({ _max: { position: 2 } });
      taskCreate.mockResolvedValue({
        id: "task-1",
        useCaseId: "uc-1",
        title: "Research competitors",
        status: "TODO",
        position: 3,
        assignee: null,
        createdBy: { id: "user-1", name: "John" },
      });

      const result = await createTask(
        { useCaseId: "uc-1", title: "Research competitors" },
        "user-1",
      );

      expect(result.title).toBe("Research competitors");
      expect(eventBus.emit).toHaveBeenCalledWith("useCase.taskCreated", expect.any(Object));
    });

    it("updates a task status", async () => {
      taskFindUnique.mockResolvedValue({ id: "task-1", useCaseId: "uc-1" });
      taskUpdate.mockResolvedValue({
        id: "task-1",
        status: "IN_PROGRESS",
        assignee: null,
        createdBy: { id: "user-1", name: "John" },
      });

      const result = await updateTask({ id: "task-1", status: "IN_PROGRESS" }, "user-1");

      expect(result.status).toBe("IN_PROGRESS");
    });

    it("deletes a task", async () => {
      taskFindUnique.mockResolvedValue({ id: "task-1", useCaseId: "uc-1" });
      taskDelete.mockResolvedValue({ id: "task-1" });

      const result = await deleteTask("task-1", "user-1");

      expect(result.id).toBe("task-1");
    });
  });

  describe("discussions", () => {
    it("creates a discussion", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      discussionCreate.mockResolvedValue({
        id: "disc-1",
        useCaseId: "uc-1",
        content: "Hello team",
        author: { id: "user-1", name: "John", email: "john@test.com", image: null },
      });

      const result = await createDiscussion(
        { useCaseId: "uc-1", content: "Hello team", isInternal: true },
        "user-1",
      );

      expect(result.content).toBe("Hello team");
      expect(eventBus.emit).toHaveBeenCalledWith("useCase.discussionCreated", expect.any(Object));
    });

    it("only author can delete discussion", async () => {
      discussionFindUnique.mockResolvedValue({ id: "disc-1", authorId: "user-1" });

      await expect(deleteDiscussion("disc-1", "user-2")).rejects.toThrow(
        "Only the author can delete this discussion",
      );
    });

    it("author can delete own discussion", async () => {
      discussionFindUnique.mockResolvedValue({ id: "disc-1", authorId: "user-1" });
      discussionDelete.mockResolvedValue({ id: "disc-1" });

      const result = await deleteDiscussion("disc-1", "user-1");

      expect(result.id).toBe("disc-1");
    });
  });

  describe("interactions", () => {
    it("creates an interaction", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      interactionCreate.mockResolvedValue({
        id: "int-1",
        useCaseId: "uc-1",
        type: "MEETING",
        summary: "Kick-off meeting",
        recordedBy: { id: "user-1", name: "John", email: "john@test.com" },
        contact: null,
      });

      const result = await createInteraction(
        { useCaseId: "uc-1", type: "MEETING", summary: "Kick-off meeting" },
        "user-1",
      );

      expect(result.summary).toBe("Kick-off meeting");
      expect(eventBus.emit).toHaveBeenCalledWith("useCase.interactionLogged", expect.any(Object));
    });
  });
});
