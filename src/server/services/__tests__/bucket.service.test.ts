import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SmartFilter } from "@/types/bucket";

// ============================================================
// Mock Prisma
// ============================================================

const mockPrisma = {
  bucket: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  ideaBucket: {
    create: vi.fn(),
    delete: vi.fn(),
    createMany: vi.fn(),
  },
  idea: {
    findMany: vi.fn(),
  },
};

vi.mock("@/server/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Import after mock setup
const bucketService = await import("@/server/services/bucket.service");

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// listBuckets
// ============================================================

describe("listBuckets", () => {
  it("should return buckets with idea counts", async () => {
    mockPrisma.bucket.findMany.mockResolvedValue([
      {
        id: "b1",
        name: "To Review",
        color: "#EF4444",
        isSmart: false,
        campaignId: "c1",
        _count: { items: 5 },
      },
      {
        id: "b2",
        name: "Approved",
        color: "#10B981",
        isSmart: false,
        campaignId: "c1",
        _count: { items: 3 },
      },
    ]);

    const result = await bucketService.listBuckets("c1");

    expect(mockPrisma.bucket.findMany).toHaveBeenCalledWith({
      where: { campaignId: "c1" },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "asc" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].ideaCount).toBe(5);
    expect(result[1].ideaCount).toBe(3);
  });
});

// ============================================================
// createBucket
// ============================================================

describe("createBucket", () => {
  it("should create a manual bucket", async () => {
    const input = {
      campaignId: "c1",
      name: "To Review",
      color: "#EF4444",
    };

    mockPrisma.bucket.create.mockResolvedValue({
      id: "b1",
      ...input,
      isSmart: false,
      smartFilter: null,
    });

    const result = await bucketService.createBucket(input);

    expect(mockPrisma.bucket.create).toHaveBeenCalledWith({
      data: {
        name: "To Review",
        color: "#EF4444",
        isSmart: false,
        campaignId: "c1",
      },
    });
    expect(result.name).toBe("To Review");
    expect(result.isSmart).toBe(false);
  });
});

// ============================================================
// createSmartBucket
// ============================================================

describe("createSmartBucket", () => {
  it("should create a smart bucket with filter criteria", async () => {
    const filter: SmartFilter = {
      status: ["HOT"],
      minVoteScore: 5,
      isHot: true,
    };

    const input = {
      campaignId: "c1",
      name: "Hot Ideas 5+",
      color: "#F59E0B",
      filter,
    };

    mockPrisma.bucket.create.mockResolvedValue({
      id: "b1",
      ...input,
      isSmart: true,
      smartFilter: filter,
    });

    const result = await bucketService.createSmartBucket(input);

    expect(mockPrisma.bucket.create).toHaveBeenCalledWith({
      data: {
        name: "Hot Ideas 5+",
        color: "#F59E0B",
        isSmart: true,
        smartFilter: filter,
        campaignId: "c1",
      },
    });
    expect(result.isSmart).toBe(true);
    expect(result.smartFilter).toEqual(filter);
  });
});

// ============================================================
// updateBucket
// ============================================================

describe("updateBucket", () => {
  it("should update bucket name and color", async () => {
    mockPrisma.bucket.update.mockResolvedValue({
      id: "b1",
      name: "Updated Name",
      color: "#06B6D4",
    });

    const result = await bucketService.updateBucket({
      bucketId: "b1",
      name: "Updated Name",
      color: "#06B6D4",
    });

    expect(mockPrisma.bucket.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { name: "Updated Name", color: "#06B6D4" },
    });
    expect(result.name).toBe("Updated Name");
  });

  it("should only update provided fields", async () => {
    mockPrisma.bucket.update.mockResolvedValue({
      id: "b1",
      name: "Only Name",
      color: "#EF4444",
    });

    await bucketService.updateBucket({
      bucketId: "b1",
      name: "Only Name",
    });

    expect(mockPrisma.bucket.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { name: "Only Name" },
    });
  });
});

// ============================================================
// deleteBucket
// ============================================================

describe("deleteBucket", () => {
  it("should delete the bucket", async () => {
    mockPrisma.bucket.delete.mockResolvedValue({ id: "b1" });

    await bucketService.deleteBucket("b1");

    expect(mockPrisma.bucket.delete).toHaveBeenCalledWith({
      where: { id: "b1" },
    });
  });
});

// ============================================================
// getBucketItems
// ============================================================

describe("getBucketItems", () => {
  it("should return ideas for a manual bucket", async () => {
    const ideas = [
      { id: "i1", title: "Idea 1" },
      { id: "i2", title: "Idea 2" },
    ];

    mockPrisma.bucket.findUniqueOrThrow.mockResolvedValue({
      id: "b1",
      isSmart: false,
      smartFilter: null,
      campaignId: "c1",
      items: ideas.map((idea) => ({ idea })),
    });

    const result = await bucketService.getBucketItems("b1");

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Idea 1");
  });

  it("should re-evaluate filter for smart buckets on access", async () => {
    const filter: SmartFilter = { isHot: true };

    mockPrisma.bucket.findUniqueOrThrow.mockResolvedValue({
      id: "b1",
      isSmart: true,
      smartFilter: filter,
      campaignId: "c1",
      items: [],
    });

    mockPrisma.idea.findMany.mockResolvedValue([
      { id: "i1", title: "Hot Idea", isHot: true },
    ]);

    const result = await bucketService.getBucketItems("b1");

    // Should have queried ideas with the smart filter
    expect(mockPrisma.idea.findMany).toHaveBeenCalledWith({
      where: {
        campaignId: "c1",
        isHot: true,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
  });
});

// ============================================================
// assignIdeaToBucket
// ============================================================

describe("assignIdeaToBucket", () => {
  it("should create idea-bucket association", async () => {
    mockPrisma.ideaBucket.create.mockResolvedValue({
      id: "ib1",
      ideaId: "i1",
      bucketId: "b1",
    });

    const result = await bucketService.assignIdeaToBucket("i1", "b1");

    expect(mockPrisma.ideaBucket.create).toHaveBeenCalledWith({
      data: { ideaId: "i1", bucketId: "b1" },
    });
    expect(result.ideaId).toBe("i1");
  });
});

// ============================================================
// removeIdeaFromBucket
// ============================================================

describe("removeIdeaFromBucket", () => {
  it("should remove idea-bucket association", async () => {
    mockPrisma.ideaBucket.delete.mockResolvedValue({
      id: "ib1",
      ideaId: "i1",
      bucketId: "b1",
    });

    await bucketService.removeIdeaFromBucket("i1", "b1");

    expect(mockPrisma.ideaBucket.delete).toHaveBeenCalledWith({
      where: {
        ideaId_bucketId: { ideaId: "i1", bucketId: "b1" },
      },
    });
  });
});

// ============================================================
// bulkAssignBucket
// ============================================================

describe("bulkAssignBucket", () => {
  it("should assign multiple ideas to a bucket", async () => {
    mockPrisma.ideaBucket.createMany.mockResolvedValue({ count: 3 });

    const result = await bucketService.bulkAssignBucket(
      ["i1", "i2", "i3"],
      "b1",
    );

    expect(mockPrisma.ideaBucket.createMany).toHaveBeenCalledWith({
      data: [
        { ideaId: "i1", bucketId: "b1" },
        { ideaId: "i2", bucketId: "b1" },
        { ideaId: "i3", bucketId: "b1" },
      ],
      skipDuplicates: true,
    });
    expect(result.count).toBe(3);
  });
});

// ============================================================
// evaluateSmartBucket
// ============================================================

describe("evaluateSmartBucket", () => {
  it("should build correct where clause from filter with status", async () => {
    mockPrisma.idea.findMany.mockResolvedValue([]);

    await bucketService.evaluateSmartBucket("c1", {
      status: ["HOT", "EVALUATION"],
    });

    expect(mockPrisma.idea.findMany).toHaveBeenCalledWith({
      where: {
        campaignId: "c1",
        status: { in: ["HOT", "EVALUATION"] },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should build where clause with numeric filters", async () => {
    mockPrisma.idea.findMany.mockResolvedValue([]);

    await bucketService.evaluateSmartBucket("c1", {
      minVoteScore: 3.5,
      minLikeCount: 5,
      minCommentCount: 2,
    });

    expect(mockPrisma.idea.findMany).toHaveBeenCalledWith({
      where: {
        campaignId: "c1",
        avgVoteScore: { gte: 3.5 },
        likeCount: { gte: 5 },
        commentCount: { gte: 2 },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should handle tag filters", async () => {
    mockPrisma.idea.findMany.mockResolvedValue([]);

    await bucketService.evaluateSmartBucket("c1", {
      tags: ["innovation", "urgent"],
    });

    expect(mockPrisma.idea.findMany).toHaveBeenCalledWith({
      where: {
        campaignId: "c1",
        tags: { some: { name: { in: ["innovation", "urgent"] } } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should handle date range filters", async () => {
    mockPrisma.idea.findMany.mockResolvedValue([]);

    await bucketService.evaluateSmartBucket("c1", {
      dateRange: {
        from: "2026-01-01",
        to: "2026-03-01",
      },
    });

    const call = mockPrisma.idea.findMany.mock.calls[0][0];
    expect(call.where.submittedAt.gte).toEqual(new Date("2026-01-01"));
    expect(call.where.submittedAt.lte).toEqual(new Date("2026-03-01"));
  });

  it("should handle combined filters", async () => {
    mockPrisma.idea.findMany.mockResolvedValue([]);

    await bucketService.evaluateSmartBucket("c1", {
      status: ["HOT"],
      minVoteScore: 5,
      isHot: true,
    });

    expect(mockPrisma.idea.findMany).toHaveBeenCalledWith({
      where: {
        campaignId: "c1",
        status: { in: ["HOT"] },
        avgVoteScore: { gte: 5 },
        isHot: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return empty array with no matching ideas", async () => {
    mockPrisma.idea.findMany.mockResolvedValue([]);

    const result = await bucketService.evaluateSmartBucket("c1", {
      minVoteScore: 100,
    });

    expect(result).toEqual([]);
  });
});
