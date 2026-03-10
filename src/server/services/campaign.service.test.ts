import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  transitionCampaign,
  getCampaignTransitions,
  revertCampaignPhase,
  copyCampaign,
  getSponsorView,
  CampaignServiceError,
  campaignCreateInput,
  campaignListInput,
  campaignCopyInput,
} from "./campaign.service";

vi.mock("@/server/lib/prisma", () => {
  const campaign = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const campaignMember = {
    count: vi.fn(),
    createMany: vi.fn(),
  };
  return {
    prisma: {
      campaign,
      campaignMember,
      campaignKpiSnapshot: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(
        (
          fn: (tx: {
            campaign: typeof campaign;
            campaignMember: typeof campaignMember;
          }) => Promise<unknown>,
        ) => fn({ campaign, campaignMember }),
      ),
    },
  };
});

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
const { evaluateTransitionGuards } = await import("@/server/lib/state-machines/transition-engine");

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const campaignCreate = prisma.campaign.create as unknown as Mock;
const campaignUpdate = prisma.campaign.update as unknown as Mock;
const mockEvaluateGuards = evaluateTransitionGuards as unknown as Mock;

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
  mockEvaluateGuards.mockResolvedValue([]);
});

describe("campaign.service", () => {
  describe("listCampaigns", () => {
    it("returns paginated campaigns", async () => {
      campaignFindMany.mockResolvedValue([mockCampaign]);

      const result = await listCampaigns({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("campaign-1");
      expect(result.items[0]?.title).toBe("Test Campaign");
      expect(result.nextCursor).toBeUndefined();
    });

    it("sets nextCursor when there are more items", async () => {
      const campaigns = Array.from({ length: 21 }, (_, i) => ({
        ...mockCampaign,
        id: `campaign-${i}`,
      }));
      campaignFindMany.mockResolvedValue(campaigns);

      const result = await listCampaigns({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("campaign-20");
    });

    it("filters by status", async () => {
      campaignFindMany.mockResolvedValue([]);

      await listCampaigns({ limit: 20, status: "DRAFT" });

      expect(campaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "DRAFT" },
        }),
      );
    });

    it("filters by search term", async () => {
      campaignFindMany.mockResolvedValue([]);

      await listCampaigns({ limit: 20, search: "test" });

      expect(campaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: "test", mode: "insensitive" } },
              { teaser: { contains: "test", mode: "insensitive" } },
            ],
          },
        }),
      );
    });
  });

  describe("getCampaignById", () => {
    it("returns the campaign when found", async () => {
      campaignFindUnique.mockResolvedValue(mockCampaign);

      const result = await getCampaignById("campaign-1");

      expect(result.id).toBe("campaign-1");
      expect(result.title).toBe("Test Campaign");
    });

    it("throws CAMPAIGN_NOT_FOUND when not found", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(getCampaignById("nonexistent")).rejects.toThrow(CampaignServiceError);
      await expect(getCampaignById("nonexistent")).rejects.toThrow("Campaign not found");
    });
  });

  describe("createCampaign", () => {
    it("creates a campaign in DRAFT status", async () => {
      campaignCreate.mockResolvedValue(mockCampaign);

      const result = await createCampaign(
        { title: "Test Campaign", description: "Campaign description" },
        "user-1",
      );

      expect(result.id).toBe("campaign-1");
      expect(campaignCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Test Campaign",
            status: "DRAFT",
            setupType: "SIMPLE",
            createdById: "user-1",
          }),
        }),
      );
    });

    it("emits campaign.created event", async () => {
      campaignCreate.mockResolvedValue(mockCampaign);

      await createCampaign({ title: "Test" }, "user-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "campaign.created",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-1",
          actor: "user-1",
        }),
      );
    });
  });

  describe("updateCampaign", () => {
    it("updates campaign fields", async () => {
      campaignFindUnique.mockResolvedValue({ id: "campaign-1", status: "DRAFT" });
      campaignUpdate.mockResolvedValue({ ...mockCampaign, title: "Updated Title" });

      const result = await updateCampaign({ id: "campaign-1", title: "Updated Title" }, "user-1");

      expect(result.title).toBe("Updated Title");
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(updateCampaign({ id: "nonexistent", title: "X" }, "user-1")).rejects.toThrow(
        "Campaign not found",
      );
    });

    it("emits campaign.updated event", async () => {
      campaignFindUnique.mockResolvedValue({ id: "campaign-1", status: "DRAFT" });
      campaignUpdate.mockResolvedValue(mockCampaign);

      await updateCampaign({ id: "campaign-1", title: "New" }, "user-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "campaign.updated",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-1",
        }),
      );
    });
  });

  describe("transitionCampaign", () => {
    it("transitions from DRAFT to SUBMISSION", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "DRAFT",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });
      campaignUpdate.mockResolvedValue({
        ...mockCampaign,
        status: "SUBMISSION",
        launchedAt: new Date(),
      });

      await transitionCampaign("campaign-1", "SUBMISSION", "user-1");

      expect(campaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUBMISSION",
            previousStatus: "DRAFT",
          }),
        }),
      );
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(transitionCampaign("nonexistent", "SUBMISSION", "user-1")).rejects.toThrow(
        "Campaign not found",
      );
    });

    it("throws INVALID_TRANSITION for invalid status change", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "DRAFT",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });

      await expect(transitionCampaign("campaign-1", "CLOSED", "user-1")).rejects.toThrow(
        "Cannot transition from DRAFT to CLOSED",
      );
    });

    it("throws GUARD_FAILED when guards fail", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "DRAFT",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });
      mockEvaluateGuards.mockResolvedValue([
        { guard: "SEEDING_TEAM_ASSIGNED", message: "Seeding team required" },
      ]);

      await expect(transitionCampaign("campaign-1", "SEEDING", "user-1")).rejects.toThrow(
        "Transition blocked",
      );
    });

    it("emits campaign.phaseChanged event", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "EVALUATION",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });
      campaignUpdate.mockResolvedValue({
        ...mockCampaign,
        status: "CLOSED",
        closedAt: new Date(),
      });

      await transitionCampaign("campaign-1", "CLOSED", "user-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "campaign.phaseChanged",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-1",
          metadata: expect.objectContaining({
            previousStatus: "EVALUATION",
            newStatus: "CLOSED",
          }),
        }),
      );
    });

    it("sets launchedAt when transitioning to SUBMISSION", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "DRAFT",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });
      campaignUpdate.mockResolvedValue({
        ...mockCampaign,
        status: "SUBMISSION",
        launchedAt: new Date(),
      });

      await transitionCampaign("campaign-1", "SUBMISSION", "user-1");

      expect(campaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            launchedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("sets closedAt when transitioning to CLOSED", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "EVALUATION",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });
      campaignUpdate.mockResolvedValue({
        ...mockCampaign,
        status: "CLOSED",
        closedAt: new Date(),
      });

      await transitionCampaign("campaign-1", "CLOSED", "user-1");

      expect(campaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            closedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("getCampaignTransitions", () => {
    it("returns valid transitions with guard status", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "DRAFT",
        previousStatus: null,
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });

      const result = await getCampaignTransitions("campaign-1");

      expect(result.currentStatus).toBe("DRAFT");
      expect(result.currentLabel).toBe("Draft");
      expect(result.canRevert).toBe(false);
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0]?.targetStatus).toBe("SEEDING");
      expect(result.transitions[1]?.targetStatus).toBe("SUBMISSION");
    });

    it("indicates canRevert when previousStatus exists", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "SUBMISSION",
        previousStatus: "DRAFT",
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
      });

      const result = await getCampaignTransitions("campaign-1");

      expect(result.canRevert).toBe(true);
      expect(result.previousStatus).toBe("DRAFT");
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(getCampaignTransitions("nonexistent")).rejects.toThrow("Campaign not found");
    });
  });

  describe("revertCampaignPhase", () => {
    it("reverts to previous status", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "SUBMISSION",
        previousStatus: "DRAFT",
      });
      campaignUpdate.mockResolvedValue({
        ...mockCampaign,
        status: "DRAFT",
        previousStatus: "SUBMISSION",
      });

      await revertCampaignPhase("campaign-1", "user-1");

      expect(campaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "DRAFT",
            previousStatus: "SUBMISSION",
          }),
        }),
      );
    });

    it("emits campaign.phaseChanged event with isRevert metadata", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "SUBMISSION",
        previousStatus: "DRAFT",
      });
      campaignUpdate.mockResolvedValue({
        ...mockCampaign,
        status: "DRAFT",
        previousStatus: "SUBMISSION",
      });

      await revertCampaignPhase("campaign-1", "user-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "campaign.phaseChanged",
        expect.objectContaining({
          metadata: expect.objectContaining({
            isRevert: true,
          }),
        }),
      );
    });

    it("throws NO_PREVIOUS_STATUS when no previous status", async () => {
      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        status: "DRAFT",
        previousStatus: null,
      });

      await expect(revertCampaignPhase("campaign-1", "user-1")).rejects.toThrow(
        "No previous status to revert to",
      );
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(revertCampaignPhase("nonexistent", "user-1")).rejects.toThrow(
        "Campaign not found",
      );
    });
  });

  describe("copyCampaign", () => {
    it("creates a new DRAFT campaign from source", async () => {
      campaignFindUnique.mockResolvedValue({ ...mockCampaign, members: [] });
      const copiedCampaign = {
        ...mockCampaign,
        id: "campaign-2",
        title: "Copied Campaign",
        createdById: "user-2",
      };
      campaignCreate.mockResolvedValue(copiedCampaign);

      const result = await copyCampaign(
        { sourceCampaignId: "campaign-1", title: "Copied Campaign" },
        "user-2",
      );

      expect(result.id).toBe("campaign-2");
      expect(result.title).toBe("Copied Campaign");
    });

    it("copies feature toggles and settings from source", async () => {
      const sourceWithSettings = {
        ...mockCampaign,
        hasSeedingPhase: false,
        hasVoting: true,
        votingCriteria: { criteria: ["impact"] },
        customFields: [{ name: "field1" }],
        members: [],
      };
      campaignFindUnique.mockResolvedValue(sourceWithSettings);
      campaignCreate.mockResolvedValue({
        ...sourceWithSettings,
        id: "campaign-2",
        title: "Copied",
      });

      await copyCampaign({ sourceCampaignId: "campaign-1", title: "Copied" }, "user-2");

      expect(campaignCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasSeedingPhase: false,
            hasVoting: true,
            votingCriteria: { criteria: ["impact"] },
            customFields: [{ name: "field1" }],
            status: "DRAFT",
          }),
        }),
      );
    });

    it("emits campaign.copied event", async () => {
      campaignFindUnique.mockResolvedValue({ ...mockCampaign, members: [] });
      campaignCreate.mockResolvedValue({
        ...mockCampaign,
        id: "campaign-2",
        title: "Copied",
      });

      await copyCampaign({ sourceCampaignId: "campaign-1", title: "Copied" }, "user-2");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "campaign.copied",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-2",
          actor: "user-2",
          metadata: expect.objectContaining({
            sourceCampaignId: "campaign-1",
          }),
        }),
      );
    });

    it("throws CAMPAIGN_NOT_FOUND when source does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(
        copyCampaign({ sourceCampaignId: "nonexistent", title: "X" }, "user-1"),
      ).rejects.toThrow("Source campaign not found");
    });
  });

  describe("getSponsorView", () => {
    it("returns campaign with sponsor info and KPI summary", async () => {
      campaignFindUnique.mockResolvedValue({
        ...mockCampaign,
        members: [
          {
            id: "member-1",
            role: "CAMPAIGN_SPONSOR",
            user: { id: "user-3", name: "Sponsor", email: "sponsor@example.com", image: null },
            assignedAt: new Date("2026-01-01"),
          },
        ],
        kpiSnapshots: [
          {
            ideasSubmitted: 10,
            totalParticipants: 50,
            totalComments: 30,
            totalVotes: 100,
            ideasSelected: 3,
          },
        ],
      });

      const result = await getSponsorView({ campaignId: "campaign-1" });

      expect(result.id).toBe("campaign-1");
      expect(result.sponsors).toHaveLength(1);
      expect(result.kpiSummary?.ideasSubmitted).toBe(10);
      expect(result.kpiSummary?.totalParticipants).toBe(50);
    });

    it("returns null kpiSummary when no snapshot exists", async () => {
      campaignFindUnique.mockResolvedValue({
        ...mockCampaign,
        members: [],
        kpiSnapshots: [],
      });

      const result = await getSponsorView({ campaignId: "campaign-1" });

      expect(result.kpiSummary).toBeNull();
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(getSponsorView({ campaignId: "nonexistent" })).rejects.toThrow(
        "Campaign not found",
      );
    });
  });

  describe("schema validation", () => {
    it("validates campaignCreateInput", () => {
      const valid = campaignCreateInput.safeParse({
        title: "Test Campaign",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects empty title", () => {
      const invalid = campaignCreateInput.safeParse({
        title: "",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates campaignListInput defaults", () => {
      const result = campaignListInput.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("validates campaignCopyInput", () => {
      const valid = campaignCopyInput.safeParse({
        sourceCampaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        title: "Copied Campaign",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects campaignCopyInput without cuid", () => {
      const invalid = campaignCopyInput.safeParse({
        sourceCampaignId: "not-a-cuid",
        title: "Copied",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
