import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  searchUsers,
  setCampaignMembers,
  listCampaignMembers,
  campaignMemberSetInput,
  campaignMemberListInput,
  userSearchInput,
} from "./campaign-member.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    campaignMember: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
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

const userFindMany = prisma.user.findMany as unknown as Mock;
const memberFindMany = prisma.campaignMember.findMany as unknown as Mock;
const transaction = prisma.$transaction as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Input Schema Tests ─────────────────────────────────

describe("userSearchInput", () => {
  it("should validate a valid search input", () => {
    const result = userSearchInput.safeParse({
      search: "john",
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty search string", () => {
    const result = userSearchInput.safeParse({
      search: "",
    });
    expect(result.success).toBe(false);
  });

  it("should apply default limit", () => {
    const result = userSearchInput.safeParse({
      search: "john",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("should accept excludeIds", () => {
    const result = userSearchInput.safeParse({
      search: "john",
      excludeIds: ["clxxxxxxxxxxxxxxxxxxxxxxxxx"],
    });
    expect(result.success).toBe(true);
  });
});

describe("campaignMemberSetInput", () => {
  it("should validate valid member set input", () => {
    const result = campaignMemberSetInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      members: [
        { userId: "clyyyyyyyyyyyyyyyyyyyyyyyyy", role: "CAMPAIGN_COACH" },
        { userId: "clzzzzzzzzzzzzzzzzzzzzzzzzz", role: "CAMPAIGN_MODERATOR" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid role", () => {
    const result = campaignMemberSetInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      members: [{ userId: "clyyyyyyyyyyyyyyyyyyyyyyyyy", role: "INVALID_ROLE" }],
    });
    expect(result.success).toBe(false);
  });

  it("should accept optional category", () => {
    const result = campaignMemberSetInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      members: [
        {
          userId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
          role: "CAMPAIGN_COACH",
          category: "Innovation",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("campaignMemberListInput", () => {
  it("should validate with just campaignId", () => {
    const result = campaignMemberListInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(result.success).toBe(true);
  });

  it("should validate with role filter", () => {
    const result = campaignMemberListInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      role: "CAMPAIGN_EVALUATOR",
    });
    expect(result.success).toBe(true);
  });
});

// ── Service Function Tests ─────────────────────────────

describe("searchUsers", () => {
  it("should search users by name or email", async () => {
    const mockUsers = [
      { id: "user-1", name: "John Doe", email: "john@example.com", image: null },
      { id: "user-2", name: "Jane Doe", email: "jane@example.com", image: null },
    ];
    userFindMany.mockResolvedValue(mockUsers);

    const result = await searchUsers({ search: "doe", limit: 10 });
    expect(result).toEqual(mockUsers);
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          OR: expect.arrayContaining([
            { name: { contains: "doe", mode: "insensitive" } },
            { email: { contains: "doe", mode: "insensitive" } },
          ]),
        }),
        take: 10,
      }),
    );
  });

  it("should exclude specified user ids", async () => {
    userFindMany.mockResolvedValue([]);

    await searchUsers({ search: "test", limit: 10, excludeIds: ["user-1"] });
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ["user-1"] },
        }),
      }),
    );
  });
});

describe("setCampaignMembers", () => {
  it("should call transaction to replace members", async () => {
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        campaignMember: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      });
    });

    const result = await setCampaignMembers(
      {
        campaignId: "campaign-1",
        members: [
          { userId: "user-1", role: "CAMPAIGN_COACH" },
          { userId: "user-2", role: "CAMPAIGN_MODERATOR" },
        ],
      },
      "actor-1",
    );

    expect(result.success).toBe(true);
    expect(transaction).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "campaign.updated",
      expect.objectContaining({
        entity: "campaign",
        entityId: "campaign-1",
        actor: "actor-1",
      }),
    );
  });
});

describe("listCampaignMembers", () => {
  it("should list members for a campaign", async () => {
    const mockMembers = [
      {
        id: "member-1",
        userId: "user-1",
        role: "CAMPAIGN_COACH",
        category: null,
        assignedAt: new Date("2026-01-01"),
        user: { id: "user-1", name: "Coach", email: "coach@test.com", image: null },
      },
    ];
    memberFindMany.mockResolvedValue(mockMembers);

    const result = await listCampaignMembers({ campaignId: "campaign-1" });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "member-1",
      userId: "user-1",
      role: "CAMPAIGN_COACH",
      category: null,
      user: { id: "user-1", name: "Coach", email: "coach@test.com", image: null },
      assignedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("should filter by role when specified", async () => {
    memberFindMany.mockResolvedValue([]);

    await listCampaignMembers({
      campaignId: "campaign-1",
      role: "CAMPAIGN_EVALUATOR",
    });
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "campaign-1", role: "CAMPAIGN_EVALUATOR" },
      }),
    );
  });
});
