import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listIdeas,
  getIdeaById,
  createIdea,
  updateIdea,
  submitIdea,
  deleteIdea,
  IdeaServiceError,
} from "./idea.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ideaCoAuthor: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
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

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const ideaFindMany = prisma.idea.findMany as unknown as Mock;
const ideaCreate = prisma.idea.create as unknown as Mock;
const ideaUpdate = prisma.idea.update as unknown as Mock;
const ideaDelete = prisma.idea.delete as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const mockTransaction = prisma.$transaction as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockContributor = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

const mockCampaign = {
  id: "campaign-1",
  title: "Test Campaign",
  status: "SUBMISSION" as const,
};

const mockIdea = {
  id: "idea-1",
  title: "Test Idea",
  teaser: "A test idea teaser",
  description: "Full description of the test idea",
  status: "DRAFT" as const,
  previousStatus: null,
  campaignId: "campaign-1",
  contributorId: "user-1",
  category: "Sustainability",
  tags: ["green", "efficiency"],
  customFieldValues: null,
  attachments: null,
  isConfidential: false,
  inventionDisclosure: false,
  likesCount: 0,
  commentsCount: 0,
  viewsCount: 0,
  submittedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  contributor: mockContributor,
  coAuthors: [],
  campaign: mockCampaign,
};

describe("idea.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listIdeas", () => {
    it("returns paginated ideas for a campaign", async () => {
      ideaFindMany.mockResolvedValue([mockIdea]);

      const result = await listIdeas({ campaignId: "campaign-1", limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("idea-1");
      expect(result.nextCursor).toBeUndefined();
      expect(ideaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: "campaign-1" },
          take: 21,
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockIdea,
        id: `idea-${i + 1}`,
      }));
      ideaFindMany.mockResolvedValue(items);

      const result = await listIdeas({ campaignId: "campaign-1", limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("idea-21");
    });

    it("applies status filter", async () => {
      ideaFindMany.mockResolvedValue([]);

      await listIdeas({ campaignId: "campaign-1", limit: 20, status: "DRAFT" });

      expect(ideaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: "campaign-1",
            status: "DRAFT",
          }),
        }),
      );
    });

    it("applies search filter", async () => {
      ideaFindMany.mockResolvedValue([]);

      await listIdeas({ campaignId: "campaign-1", limit: 20, search: "test" });

      expect(ideaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: "campaign-1",
            OR: [
              { title: { contains: "test", mode: "insensitive" } },
              { teaser: { contains: "test", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("applies tag filter", async () => {
      ideaFindMany.mockResolvedValue([]);

      await listIdeas({ campaignId: "campaign-1", limit: 20, tag: "green" });

      expect(ideaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { has: "green" },
          }),
        }),
      );
    });
  });

  describe("getIdeaById", () => {
    it("returns idea with full details", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);

      const result = await getIdeaById("idea-1");

      expect(result.id).toBe("idea-1");
      expect(result.title).toBe("Test Idea");
      expect(result.contributor).toEqual(mockContributor);
      expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    });

    it("throws IDEA_NOT_FOUND when idea does not exist", async () => {
      ideaFindUnique.mockResolvedValue(null);

      await expect(getIdeaById("nonexistent")).rejects.toThrow(IdeaServiceError);
      await expect(getIdeaById("nonexistent")).rejects.toMatchObject({
        code: "IDEA_NOT_FOUND",
      });
    });
  });

  describe("createIdea", () => {
    it("creates a draft idea successfully", async () => {
      campaignFindUnique.mockResolvedValue(mockCampaign);
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      ideaCreate.mockResolvedValue(mockIdea);

      const result = await createIdea(
        {
          campaignId: "campaign-1",
          title: "New Idea",
          teaser: "A new idea",
          description: "Idea description",
          submitImmediately: false,
        },
        "user-1",
      );

      expect(result.id).toBe("idea-1");
      expect(mockEmit).toHaveBeenCalledWith(
        "idea.created",
        expect.objectContaining({
          entity: "idea",
          entityId: "idea-1",
          actor: "user-1",
        }),
      );
    });

    it("creates and submits idea immediately", async () => {
      campaignFindUnique.mockResolvedValue(mockCampaign);
      const submittedIdea = { ...mockIdea, status: "QUALIFICATION" as const };
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      ideaCreate.mockResolvedValue(submittedIdea);

      const result = await createIdea(
        {
          campaignId: "campaign-1",
          title: "Submitted Idea",
          submitImmediately: true,
        },
        "user-1",
      );

      expect(result.status).toBe("QUALIFICATION");
      expect(mockEmit).toHaveBeenCalledWith(
        "idea.submitted",
        expect.objectContaining({
          entity: "idea",
        }),
      );
    });

    it("throws when campaign not found", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(
        createIdea({ campaignId: "nonexistent", title: "Idea" }, "user-1"),
      ).rejects.toMatchObject({
        code: "CAMPAIGN_NOT_FOUND",
      });
    });

    it("throws when campaign is not accepting submissions for immediate submit", async () => {
      campaignFindUnique.mockResolvedValue({ ...mockCampaign, status: "CLOSED" });

      await expect(
        createIdea({ campaignId: "campaign-1", title: "Idea", submitImmediately: true }, "user-1"),
      ).rejects.toMatchObject({
        code: "CAMPAIGN_NOT_ACCEPTING",
      });
    });
  });

  describe("submitIdea", () => {
    it("submits a draft idea to QUALIFICATION", async () => {
      ideaFindUnique.mockResolvedValue({
        ...mockIdea,
        campaign: mockCampaign,
      });
      const submittedIdea = {
        ...mockIdea,
        status: "QUALIFICATION" as const,
        previousStatus: "DRAFT" as const,
        submittedAt: new Date(),
      };
      ideaUpdate.mockResolvedValue(submittedIdea);

      const result = await submitIdea("idea-1", "user-1");

      expect(result.status).toBe("QUALIFICATION");
      expect(ideaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "idea-1" },
          data: expect.objectContaining({
            status: "QUALIFICATION",
            previousStatus: "DRAFT",
          }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        "idea.submitted",
        expect.objectContaining({
          entityId: "idea-1",
          metadata: expect.objectContaining({
            previousStatus: "DRAFT",
            newStatus: "QUALIFICATION",
          }),
        }),
      );
    });

    it("throws when idea is not in DRAFT status", async () => {
      ideaFindUnique.mockResolvedValue({
        ...mockIdea,
        status: "QUALIFICATION",
        campaign: mockCampaign,
      });

      await expect(submitIdea("idea-1", "user-1")).rejects.toMatchObject({
        code: "INVALID_STATUS",
      });
    });

    it("throws when campaign is not accepting submissions", async () => {
      ideaFindUnique.mockResolvedValue({
        ...mockIdea,
        campaign: { ...mockCampaign, status: "CLOSED" },
      });

      await expect(submitIdea("idea-1", "user-1")).rejects.toMatchObject({
        code: "CAMPAIGN_NOT_ACCEPTING",
      });
    });
  });

  describe("deleteIdea", () => {
    it("deletes an idea successfully", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);
      ideaDelete.mockResolvedValue(mockIdea);

      const result = await deleteIdea("idea-1", "user-1");

      expect(result.id).toBe("idea-1");
      expect(ideaDelete).toHaveBeenCalledWith({ where: { id: "idea-1" } });
      expect(mockEmit).toHaveBeenCalledWith(
        "idea.deleted",
        expect.objectContaining({
          entityId: "idea-1",
        }),
      );
    });

    it("throws when idea not found", async () => {
      ideaFindUnique.mockResolvedValue(null);

      await expect(deleteIdea("nonexistent", "user-1")).rejects.toMatchObject({
        code: "IDEA_NOT_FOUND",
      });
    });

    it("throws NOT_AUTHORIZED when actor is not the contributor", async () => {
      ideaFindUnique.mockResolvedValue(mockIdea);

      await expect(deleteIdea("idea-1", "other-user")).rejects.toMatchObject({
        code: "NOT_AUTHORIZED",
      });
    });
  });

  describe("updateIdea", () => {
    it("updates an idea successfully", async () => {
      ideaFindUnique.mockResolvedValue({ ...mockIdea, coAuthors: [] });
      const updatedIdea = { ...mockIdea, title: "Updated Title" };
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      ideaUpdate.mockResolvedValue(updatedIdea);

      const result = await updateIdea({ id: "idea-1", title: "Updated Title" }, "user-1");

      expect(result.title).toBe("Updated Title");
      expect(mockEmit).toHaveBeenCalledWith(
        "idea.updated",
        expect.objectContaining({
          entityId: "idea-1",
        }),
      );
    });

    it("allows co-author to update idea", async () => {
      ideaFindUnique.mockResolvedValue({
        ...mockIdea,
        coAuthors: [{ userId: "co-author-1" }],
      });
      const updatedIdea = { ...mockIdea, title: "Co-author Update" };
      mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(prisma);
      });
      ideaUpdate.mockResolvedValue(updatedIdea);

      const result = await updateIdea({ id: "idea-1", title: "Co-author Update" }, "co-author-1");

      expect(result.title).toBe("Co-author Update");
    });

    it("throws NOT_AUTHORIZED when actor is not contributor or co-author", async () => {
      ideaFindUnique.mockResolvedValue({ ...mockIdea, coAuthors: [] });

      await expect(updateIdea({ id: "idea-1", title: "X" }, "other-user")).rejects.toMatchObject({
        code: "NOT_AUTHORIZED",
      });
    });

    it("throws when idea not found", async () => {
      ideaFindUnique.mockResolvedValue(null);

      await expect(updateIdea({ id: "nonexistent", title: "X" }, "user-1")).rejects.toMatchObject({
        code: "IDEA_NOT_FOUND",
      });
    });
  });
});
