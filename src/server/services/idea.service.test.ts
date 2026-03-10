import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdeaService } from "./idea.service";
import { IdeaStatus, IdeaCreationType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// Mock the event bus
vi.mock("../events/event-bus", () => ({
  eventBus: {
    emitIdeaSplit: vi.fn(),
    emitIdeaMerged: vi.fn(),
    emitIdeaBulkAction: vi.fn(),
    emitIdeaArchived: vi.fn(),
    emitIdeaBucketAssigned: vi.fn(),
  },
}));

function createMockPrisma() {
  return {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ideaCoAuthor: {
      createMany: vi.fn(),
    },
    ideaTag: {
      createMany: vi.fn(),
    },
    ideaBucket: {
      createMany: vi.fn(),
    },
    comment: {
      updateMany: vi.fn(),
    },
    vote: {
      createMany: vi.fn(),
    },
    like: {
      createMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    bucket: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

function makeIdea(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    title: "Test Idea",
    description: "Test description",
    status: IdeaStatus.COMMUNITY_DISCUSSION,
    creationType: IdeaCreationType.DIRECT,
    contributorId: "user-1",
    campaignId: "campaign-1",
    isConfidential: false,
    mergedFromIds: [],
    splitFromId: null,
    viewCount: 10,
    commentCount: 5,
    likeCount: 3,
    voteCount: 2,
    avgVoteScore: 4.0,
    isHot: false,
    hotAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    coAuthors: [],
    comments: [],
    votes: [],
    likes: [],
    tags: [],
    bucketAssignments: [],
    ...overrides,
  };
}

describe("IdeaService", () => {
  let mockPrisma: MockPrisma;
  let service: IdeaService;
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new IdeaService(mockPrisma as any);
  });

  // ============================================================
  // SPLIT IDEA
  // ============================================================
  describe("splitIdea", () => {
    it("should split an idea into multiple new ideas", async () => {
      const original = makeIdea({
        coAuthors: [{ id: "ca-1", ideaId: "idea-1", userId: "user-2" }],
        tags: [{ id: "it-1", ideaId: "idea-1", tagId: "tag-1" }],
        bucketAssignments: [
          { id: "ib-1", ideaId: "idea-1", bucketId: "bucket-1" },
        ],
      });

      mockPrisma.idea.findUnique.mockResolvedValue(original);

      const newIdea1 = makeIdea({
        id: "idea-2",
        title: "Split A",
        creationType: IdeaCreationType.SPLIT,
        splitFromId: "idea-1",
      });
      const newIdea2 = makeIdea({
        id: "idea-3",
        title: "Split B",
        creationType: IdeaCreationType.SPLIT,
        splitFromId: "idea-1",
      });

      // Mock transaction to execute the callback
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txMock = {
          idea: {
            create: vi
              .fn()
              .mockResolvedValueOnce(newIdea1)
              .mockResolvedValueOnce(newIdea2),
            update: vi.fn().mockResolvedValue({}),
          },
          ideaCoAuthor: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          ideaTag: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          ideaBucket: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          activityLog: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      const result = await service.splitIdea(
        {
          ideaId: "idea-1",
          splits: [
            { title: "Split A", description: "Part A" },
            { title: "Split B", description: "Part B" },
          ],
          archiveOriginal: true,
        },
        userId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe("Split A");
      expect(result[1]!.title).toBe("Split B");
    });

    it("should throw NOT_FOUND when idea does not exist", async () => {
      mockPrisma.idea.findUnique.mockResolvedValue(null);

      await expect(
        service.splitIdea(
          {
            ideaId: "nonexistent",
            splits: [{ title: "A" }, { title: "B" }],
            archiveOriginal: true,
          },
          userId,
        ),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.splitIdea(
          {
            ideaId: "nonexistent",
            splits: [{ title: "A" }, { title: "B" }],
            archiveOriginal: true,
          },
          userId,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("should throw BAD_REQUEST for ideas in DRAFT status", async () => {
      mockPrisma.idea.findUnique.mockResolvedValue(
        makeIdea({ status: IdeaStatus.DRAFT }),
      );

      await expect(
        service.splitIdea(
          {
            ideaId: "idea-1",
            splits: [{ title: "A" }, { title: "B" }],
            archiveOriginal: true,
          },
          userId,
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should throw BAD_REQUEST for ideas in ARCHIVED status", async () => {
      mockPrisma.idea.findUnique.mockResolvedValue(
        makeIdea({ status: IdeaStatus.ARCHIVED }),
      );

      await expect(
        service.splitIdea(
          {
            ideaId: "idea-1",
            splits: [{ title: "A" }, { title: "B" }],
            archiveOriginal: true,
          },
          userId,
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should throw BAD_REQUEST for ideas without a campaign", async () => {
      mockPrisma.idea.findUnique.mockResolvedValue(
        makeIdea({ campaignId: null }),
      );

      await expect(
        service.splitIdea(
          {
            ideaId: "idea-1",
            splits: [{ title: "A" }, { title: "B" }],
            archiveOriginal: true,
          },
          userId,
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should not archive original when archiveOriginal is false", async () => {
      mockPrisma.idea.findUnique.mockResolvedValue(makeIdea());

      const newIdea = makeIdea({ id: "idea-new", title: "Split" });
      let archiveCalled = false;

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txMock = {
          idea: {
            create: vi.fn().mockResolvedValue(newIdea),
            update: vi.fn().mockImplementation(() => {
              archiveCalled = true;
              return Promise.resolve({});
            }),
          },
          ideaCoAuthor: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          ideaTag: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          ideaBucket: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          activityLog: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.splitIdea(
        {
          ideaId: "idea-1",
          splits: [{ title: "A" }, { title: "B" }],
          archiveOriginal: false,
        },
        userId,
      );

      expect(archiveCalled).toBe(false);
    });
  });

  // ============================================================
  // MERGE IDEAS
  // ============================================================
  describe("mergeIdeas", () => {
    it("should merge multiple ideas into one", async () => {
      const idea1 = makeIdea({
        id: "idea-1",
        title: "Idea A",
        contributorId: "user-1",
        coAuthors: [],
        comments: [{ id: "comment-1" }],
        votes: [{ id: "v-1", userId: "user-1", criterionId: null, score: 4 }],
        likes: [{ id: "l-1", userId: "user-1" }],
        tags: [{ id: "it-1", tagId: "tag-1" }],
        bucketAssignments: [{ id: "ib-1", bucketId: "bucket-1" }],
      });
      const idea2 = makeIdea({
        id: "idea-2",
        title: "Idea B",
        contributorId: "user-2",
        coAuthors: [],
        comments: [{ id: "comment-2" }],
        votes: [{ id: "v-2", userId: "user-2", criterionId: null, score: 3 }],
        likes: [{ id: "l-2", userId: "user-2" }],
        tags: [{ id: "it-2", tagId: "tag-2" }],
        bucketAssignments: [{ id: "ib-2", bucketId: "bucket-2" }],
      });

      mockPrisma.idea.findMany.mockResolvedValue([idea1, idea2]);

      const mergedIdea = makeIdea({
        id: "idea-merged",
        title: "Idea A + Idea B",
        creationType: IdeaCreationType.MERGED,
        mergedFromIds: ["idea-1", "idea-2"],
      });

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txMock = {
          idea: {
            create: vi.fn().mockResolvedValue(mergedIdea),
            update: vi.fn().mockResolvedValue({}),
          },
          ideaCoAuthor: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          comment: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
          vote: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
          like: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
          ideaTag: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
          ideaBucket: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
          activityLog: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      const result = await service.mergeIdeas(
        {
          ideaIds: ["idea-1", "idea-2"],
          campaignId: "campaign-1",
        },
        userId,
      );

      expect(result.id).toBe("idea-merged");
      expect(result.creationType).toBe(IdeaCreationType.MERGED);
    });

    it("should throw NOT_FOUND when ideas don't match campaign", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([makeIdea({ id: "idea-1" })]);

      await expect(
        service.mergeIdeas(
          {
            ideaIds: ["idea-1", "idea-missing"],
            campaignId: "campaign-1",
          },
          userId,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("should throw BAD_REQUEST when ideas are in invalid status", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([
        makeIdea({ id: "idea-1", status: IdeaStatus.COMMUNITY_DISCUSSION }),
        makeIdea({ id: "idea-2", status: IdeaStatus.ARCHIVED }),
      ]);

      await expect(
        service.mergeIdeas(
          {
            ideaIds: ["idea-1", "idea-2"],
            campaignId: "campaign-1",
          },
          userId,
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should use provided title and description when given", async () => {
      const ideas = [makeIdea({ id: "idea-1" }), makeIdea({ id: "idea-2" })];
      mockPrisma.idea.findMany.mockResolvedValue(ideas);

      let createArgs: Record<string, unknown> = {};
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const mergedIdea = makeIdea({ id: "merged" });
        const txMock = {
          idea: {
            create: vi
              .fn()
              .mockImplementation((args: Record<string, unknown>) => {
                createArgs = args;
                return Promise.resolve(mergedIdea);
              }),
            update: vi.fn().mockResolvedValue({}),
          },
          ideaCoAuthor: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          comment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          vote: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          like: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          ideaTag: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          ideaBucket: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          activityLog: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.mergeIdeas(
        {
          ideaIds: ["idea-1", "idea-2"],
          campaignId: "campaign-1",
          title: "Custom Title",
          description: "Custom description",
        },
        userId,
      );

      const data = createArgs as {
        data?: { title?: string; description?: string };
      };
      expect(data.data?.title).toBe("Custom Title");
      expect(data.data?.description).toBe("Custom description");
    });

    it("should deduplicate votes keeping highest score per user/criterion", async () => {
      const ideas = [
        makeIdea({
          id: "idea-1",
          votes: [{ id: "v1", userId: "user-1", criterionId: null, score: 3 }],
        }),
        makeIdea({
          id: "idea-2",
          votes: [{ id: "v2", userId: "user-1", criterionId: null, score: 5 }],
        }),
      ];
      mockPrisma.idea.findMany.mockResolvedValue(ideas);

      let voteCreateData: Array<Record<string, unknown>> = [];
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txMock = {
          idea: {
            create: vi.fn().mockResolvedValue(makeIdea({ id: "merged" })),
            update: vi.fn().mockResolvedValue({}),
          },
          ideaCoAuthor: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          comment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          vote: {
            createMany: vi
              .fn()
              .mockImplementation(
                (args: { data: Array<Record<string, unknown>> }) => {
                  voteCreateData = args.data;
                  return Promise.resolve({ count: args.data.length });
                },
              ),
          },
          like: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          ideaTag: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          ideaBucket: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
          activityLog: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.mergeIdeas(
        {
          ideaIds: ["idea-1", "idea-2"],
          campaignId: "campaign-1",
        },
        userId,
      );

      // Should only have 1 vote (deduplicated, keeping score 5)
      expect(voteCreateData).toHaveLength(1);
      expect(voteCreateData[0]!.score).toBe(5);
    });
  });

  // ============================================================
  // BULK ASSIGN BUCKET
  // ============================================================
  describe("bulkAssignBucket", () => {
    it("should assign multiple ideas to a bucket", async () => {
      mockPrisma.bucket.findUnique.mockResolvedValue({
        id: "bucket-1",
        name: "Priority",
      });
      mockPrisma.idea.findMany.mockResolvedValue([
        { id: "idea-1" },
        { id: "idea-2" },
      ]);
      mockPrisma.ideaBucket.createMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkAssignBucket(
        { ideaIds: ["idea-1", "idea-2"], bucketId: "bucket-1" },
        userId,
      );

      expect(result.assignedCount).toBe(2);
      expect(mockPrisma.ideaBucket.createMany).toHaveBeenCalledWith({
        data: [
          { ideaId: "idea-1", bucketId: "bucket-1" },
          { ideaId: "idea-2", bucketId: "bucket-1" },
        ],
        skipDuplicates: true,
      });
    });

    it("should throw NOT_FOUND when bucket doesn't exist", async () => {
      mockPrisma.bucket.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkAssignBucket(
          { ideaIds: ["idea-1"], bucketId: "nonexistent" },
          userId,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("should throw NOT_FOUND when no ideas match", async () => {
      mockPrisma.bucket.findUnique.mockResolvedValue({
        id: "bucket-1",
        name: "Test",
      });
      mockPrisma.idea.findMany.mockResolvedValue([]);

      await expect(
        service.bulkAssignBucket(
          { ideaIds: ["nonexistent"], bucketId: "bucket-1" },
          userId,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  // ============================================================
  // BULK ARCHIVE
  // ============================================================
  describe("bulkArchive", () => {
    it("should archive multiple ideas", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([
        { id: "idea-1", status: IdeaStatus.COMMUNITY_DISCUSSION },
        { id: "idea-2", status: IdeaStatus.HOT },
      ]);

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txMock = {
          idea: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
          activityLog: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        };
        return cb(txMock);
      });

      const result = await service.bulkArchive(
        { ideaIds: ["idea-1", "idea-2"] },
        userId,
      );

      expect(result.archivedCount).toBe(2);
    });

    it("should include reason in activity log when provided", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([
        { id: "idea-1", status: IdeaStatus.DRAFT },
      ]);

      let logData: Array<Record<string, unknown>> = [];
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const txMock = {
          idea: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          activityLog: {
            createMany: vi
              .fn()
              .mockImplementation(
                (args: { data: Array<Record<string, unknown>> }) => {
                  logData = args.data;
                  return Promise.resolve({ count: 1 });
                },
              ),
          },
        };
        return cb(txMock);
      });

      await service.bulkArchive(
        { ideaIds: ["idea-1"], reason: "No longer relevant" },
        userId,
      );

      expect(logData[0]!.metadata).toEqual({ reason: "No longer relevant" });
    });

    it("should throw BAD_REQUEST when no ideas are eligible", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([]);

      await expect(
        service.bulkArchive({ ideaIds: ["idea-1"] }, userId),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ============================================================
  // BULK EXPORT
  // ============================================================
  describe("bulkExport", () => {
    const exportIdea = makeIdea({
      id: "idea-1",
      title: "Exportable Idea",
      contributor: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
      coAuthors: [
        {
          user: {
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
          },
        },
      ],
      tags: [{ tag: { name: "innovation" } }],
      bucketAssignments: [{ bucket: { name: "Priority" } }],
    });

    it("should export ideas as JSON", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([exportIdea]);

      const result = await service.bulkExport({
        ideaIds: ["idea-1"],
        format: "json",
      });

      expect(result.format).toBe("json");
      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe("Exportable Idea");
      expect(parsed[0].contributor).toBe("John Doe");
      expect(parsed[0].coAuthors).toEqual(["Jane Doe"]);
      expect(parsed[0].tags).toEqual(["innovation"]);
      expect(parsed[0].buckets).toEqual(["Priority"]);
    });

    it("should export ideas as CSV", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([exportIdea]);

      const result = await service.bulkExport({
        ideaIds: ["idea-1"],
        format: "csv",
      });

      expect(result.format).toBe("csv");
      expect(result.data).toContain("ID,Title,Status");
      expect(result.data).toContain("Exportable Idea");
    });

    it("should throw NOT_FOUND when no ideas match", async () => {
      mockPrisma.idea.findMany.mockResolvedValue([]);

      await expect(
        service.bulkExport({ ideaIds: ["nonexistent"], format: "json" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
