import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  copyCampaign,
  getSponsorView,
  addSponsorComment,
  approveSponsorShortlist,
  CampaignServiceError,
} from "./campaign.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    campaignMember: {
      createMany: vi.fn(),
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

vi.mock("@/server/lib/state-machines/transition-engine", () => ({
  evaluateTransitionGuards: vi.fn().mockResolvedValue([]),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const mockTransaction = prisma.$transaction as unknown as Mock;

const mockCreatedBy = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

const mockCampaign = {
  id: "campaign-1",
  title: "Test Campaign",
  teaser: "A test campaign",
  description: "Campaign description",
  bannerUrl: null,
  videoUrl: null,
  status: "DRAFT" as const,
  previousStatus: null,
  submissionType: "CALL_FOR_IDEAS" as const,
  setupType: "SIMPLE" as const,
  audienceType: "ALL_INTERNAL" as const,
  submissionCloseDate: null,
  votingCloseDate: null,
  plannedCloseDate: null,
  launchedAt: null,
  closedAt: null,
  hasSeedingPhase: true,
  hasDiscussionPhase: true,
  hasCommunityGraduation: true,
  hasQualificationPhase: false,
  hasVoting: false,
  hasLikes: true,
  hasIdeaCoach: false,
  isConfidentialAllowed: false,
  isFeatured: false,
  isShowOnStartPage: true,
  graduationVisitors: 10,
  graduationCommenters: 5,
  graduationLikes: 0,
  graduationVoters: 0,
  graduationVotingLevel: 0,
  graduationDaysInStatus: 0,
  coachAssignmentMode: "GLOBAL" as const,
  ideaCategories: null,
  votingCriteria: null,
  customFields: null,
  settings: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: mockCreatedBy,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("copyCampaign", () => {
  it("creates a new DRAFT campaign with settings copied from source", async () => {
    const sourceWithMembers = {
      ...mockCampaign,
      members: [
        { userId: "user-2", role: "CAMPAIGN_MANAGER" as const, category: null },
        { userId: "user-3", role: "CAMPAIGN_COACH" as const, category: "tech" },
      ],
    };

    campaignFindUnique.mockResolvedValue(sourceWithMembers);

    const newCampaign = {
      ...mockCampaign,
      id: "campaign-2",
      title: "Copied Campaign",
      createdById: "user-1",
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        campaign: {
          create: vi.fn().mockResolvedValue(newCampaign),
        },
        campaignMember: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      return fn(tx);
    });

    const result = await copyCampaign(
      { sourceCampaignId: "campaign-1", title: "Copied Campaign" },
      "user-1",
    );

    expect(result.id).toBe("campaign-2");
    expect(result.title).toBe("Copied Campaign");
    expect(campaignFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "campaign-1" },
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "campaign.copied",
      expect.objectContaining({
        entity: "campaign",
        entityId: "campaign-2",
        metadata: expect.objectContaining({
          sourceCampaignId: "campaign-1",
        }),
      }),
    );
  });

  it("throws when source campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      copyCampaign({ sourceCampaignId: "nonexistent", title: "Copy" }, "user-1"),
    ).rejects.toThrow(CampaignServiceError);
  });

  it("copies campaign with no members successfully", async () => {
    const sourceNoMembers = {
      ...mockCampaign,
      members: [],
    };

    campaignFindUnique.mockResolvedValue(sourceNoMembers);

    const newCampaign = {
      ...mockCampaign,
      id: "campaign-3",
      title: "Empty Copy",
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        campaign: {
          create: vi.fn().mockResolvedValue(newCampaign),
        },
        campaignMember: {
          createMany: vi.fn(),
        },
      };
      return fn(tx);
    });

    const result = await copyCampaign(
      { sourceCampaignId: "campaign-1", title: "Empty Copy" },
      "user-1",
    );

    expect(result.id).toBe("campaign-3");
  });
});

describe("getSponsorView", () => {
  it("returns simplified campaign view with KPI summary", async () => {
    const campaignWithSponsor = {
      ...mockCampaign,
      members: [
        {
          role: "CAMPAIGN_SPONSOR" as const,
          user: { id: "sponsor-1", name: "Sponsor", email: "sponsor@test.com", image: null },
        },
      ],
      kpiSnapshots: [
        {
          ideasSubmitted: 15,
          ideasSelected: 3,
          totalParticipants: 42,
          totalComments: 100,
          totalVotes: 200,
        },
      ],
    };

    campaignFindUnique.mockResolvedValue(campaignWithSponsor);

    const result = await getSponsorView({ campaignId: "campaign-1" });

    expect(result.id).toBe("campaign-1");
    expect(result.sponsors).toHaveLength(1);
    expect(result.sponsors[0]?.name).toBe("Sponsor");
    expect(result.kpiSummary).toEqual({
      ideasSubmitted: 15,
      ideasSelected: 3,
      totalParticipants: 42,
      totalComments: 100,
      totalVotes: 200,
    });
  });

  it("returns null kpiSummary when no snapshots exist", async () => {
    const campaignNoKpi = {
      ...mockCampaign,
      members: [],
      kpiSnapshots: [],
    };

    campaignFindUnique.mockResolvedValue(campaignNoKpi);

    const result = await getSponsorView({ campaignId: "campaign-1" });

    expect(result.kpiSummary).toBeNull();
    expect(result.sponsors).toHaveLength(0);
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(getSponsorView({ campaignId: "nonexistent" })).rejects.toThrow(
      CampaignServiceError,
    );
  });
});

describe("addSponsorComment", () => {
  it("emits event and returns comment data", async () => {
    campaignFindUnique.mockResolvedValue({ id: "campaign-1", title: "Test" });

    const result = await addSponsorComment(
      { campaignId: "campaign-1", ideaId: "idea-1", content: "Great idea!" },
      "sponsor-1",
    );

    expect(result.campaignId).toBe("campaign-1");
    expect(result.ideaId).toBe("idea-1");
    expect(result.content).toBe("Great idea!");
    expect(result.sponsorId).toBe("sponsor-1");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "campaign.sponsorCommented",
      expect.objectContaining({
        entity: "campaign",
        entityId: "campaign-1",
      }),
    );
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      addSponsorComment(
        { campaignId: "nonexistent", ideaId: "idea-1", content: "Comment" },
        "sponsor-1",
      ),
    ).rejects.toThrow(CampaignServiceError);
  });
});

describe("approveSponsorShortlist", () => {
  it("emits event and returns approval data", async () => {
    campaignFindUnique.mockResolvedValue({ id: "campaign-1", title: "Test" });

    const result = await approveSponsorShortlist(
      { campaignId: "campaign-1", ideaIds: ["idea-1", "idea-2"], approved: true },
      "sponsor-1",
    );

    expect(result.campaignId).toBe("campaign-1");
    expect(result.ideaIds).toEqual(["idea-1", "idea-2"]);
    expect(result.approved).toBe(true);
    expect(result.decidedBy).toBe("sponsor-1");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "campaign.shortlistApproved",
      expect.objectContaining({
        entity: "campaign",
        metadata: expect.objectContaining({
          ideaIds: ["idea-1", "idea-2"],
          approved: true,
        }),
      }),
    );
  });

  it("handles rejection (approved: false)", async () => {
    campaignFindUnique.mockResolvedValue({ id: "campaign-1", title: "Test" });

    const result = await approveSponsorShortlist(
      { campaignId: "campaign-1", ideaIds: ["idea-1"], approved: false },
      "sponsor-1",
    );

    expect(result.approved).toBe(false);
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      approveSponsorShortlist(
        { campaignId: "nonexistent", ideaIds: ["idea-1"], approved: true },
        "sponsor-1",
      ),
    ).rejects.toThrow(CampaignServiceError);
  });
});

describe("campaign schemas", () => {
  it("validates campaignCopyInput", async () => {
    const { campaignCopyInput } = await import("./campaign.schemas");

    const valid = campaignCopyInput.safeParse({
      sourceCampaignId: "clxyz123456789012345678",
      title: "Copied Campaign",
    });
    expect(valid.success).toBe(true);

    const invalid = campaignCopyInput.safeParse({
      sourceCampaignId: "not-a-cuid",
      title: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates campaignSponsorCommentInput", async () => {
    const { campaignSponsorCommentInput } = await import("./campaign.schemas");

    const valid = campaignSponsorCommentInput.safeParse({
      campaignId: "clxyz123456789012345678",
      ideaId: "clxyz123456789012345679",
      content: "Great idea!",
    });
    expect(valid.success).toBe(true);

    const invalid = campaignSponsorCommentInput.safeParse({
      campaignId: "clxyz123456789012345678",
      ideaId: "clxyz123456789012345679",
      content: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates campaignSponsorApproveInput", async () => {
    const { campaignSponsorApproveInput } = await import("./campaign.schemas");

    const valid = campaignSponsorApproveInput.safeParse({
      campaignId: "clxyz123456789012345678",
      ideaIds: ["clxyz123456789012345679"],
      approved: true,
    });
    expect(valid.success).toBe(true);

    const invalidEmpty = campaignSponsorApproveInput.safeParse({
      campaignId: "clxyz123456789012345678",
      ideaIds: [],
      approved: true,
    });
    expect(invalidEmpty.success).toBe(false);
  });
});
