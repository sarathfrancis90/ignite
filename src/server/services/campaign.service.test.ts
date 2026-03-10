import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  transitionCampaign,
  CampaignServiceError,
  campaignCreateInput,
  campaignListInput,
} from "./campaign.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const campaignCreate = prisma.campaign.create as unknown as Mock;
const campaignUpdate = prisma.campaign.update as unknown as Mock;

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
  hasVoting: false,
  hasLikes: true,
  isConfidentialAllowed: false,
  isFeatured: false,
  isShowOnStartPage: true,
  graduationVisitors: 10,
  graduationCommenters: 5,
  graduationLikes: 0,
  graduationVoters: 0,
  graduationVotingLevel: 0,
  graduationDaysInStatus: 0,
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
  });
});
