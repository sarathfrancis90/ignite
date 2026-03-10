import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { checkScheduledTransitions } from "./campaign-scheduler.job";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
    },
    campaignMember: {
      count: vi.fn(),
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

vi.mock("@/server/lib/state-machines/transition-engine", () => ({
  evaluateTransitionGuards: vi.fn().mockResolvedValue([]),
}));

const { prisma } = await import("@/server/lib/prisma");

const campaignFindMany = prisma.campaign.findMany as unknown as Mock;

// Mock for the transitionCampaign call within the scheduler
// We also need to mock campaign.findUnique and campaign.update for the transitionCampaign function
vi.mock("@/server/services/campaign.service", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/services/campaign.service")>();
  return {
    ...mod,
    transitionCampaign: vi.fn().mockResolvedValue({}),
  };
});

const { transitionCampaign } = await import("@/server/services/campaign.service");
const mockTransitionCampaign = transitionCampaign as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockTransitionCampaign.mockResolvedValue({});
});

describe("campaign-scheduler.job", () => {
  describe("checkScheduledTransitions", () => {
    it("returns 0 when no campaigns need transition", async () => {
      campaignFindMany.mockResolvedValue([]);

      const result = await checkScheduledTransitions();
      expect(result).toBe(0);
    });

    it("transitions SUBMISSION campaigns past submissionCloseDate to DISCUSSION_VOTING", async () => {
      campaignFindMany
        .mockResolvedValueOnce([{ id: "campaign-1", title: "Test", hasDiscussionPhase: true }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await checkScheduledTransitions();
      expect(result).toBe(1);
      expect(mockTransitionCampaign).toHaveBeenCalledWith(
        "campaign-1",
        "DISCUSSION_VOTING",
        "system:campaign-scheduler",
      );
    });

    it("transitions SUBMISSION campaigns to EVALUATION when no discussion phase", async () => {
      campaignFindMany
        .mockResolvedValueOnce([{ id: "campaign-1", title: "Test", hasDiscussionPhase: false }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await checkScheduledTransitions();
      expect(result).toBe(1);
      expect(mockTransitionCampaign).toHaveBeenCalledWith(
        "campaign-1",
        "EVALUATION",
        "system:campaign-scheduler",
      );
    });

    it("transitions DISCUSSION_VOTING campaigns past votingCloseDate", async () => {
      campaignFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "campaign-2", title: "Voting Campaign" }])
        .mockResolvedValueOnce([]);

      const result = await checkScheduledTransitions();
      expect(result).toBe(1);
      expect(mockTransitionCampaign).toHaveBeenCalledWith(
        "campaign-2",
        "EVALUATION",
        "system:campaign-scheduler",
      );
    });

    it("transitions EVALUATION campaigns past plannedCloseDate", async () => {
      campaignFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "campaign-3", title: "Eval Campaign" }]);

      const result = await checkScheduledTransitions();
      expect(result).toBe(1);
      expect(mockTransitionCampaign).toHaveBeenCalledWith(
        "campaign-3",
        "CLOSED",
        "system:campaign-scheduler",
      );
    });

    it("continues processing when a transition fails", async () => {
      campaignFindMany
        .mockResolvedValueOnce([
          { id: "campaign-1", title: "Fail", hasDiscussionPhase: true },
          { id: "campaign-2", title: "Pass", hasDiscussionPhase: true },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockTransitionCampaign
        .mockRejectedValueOnce(new Error("Guard failed"))
        .mockResolvedValueOnce({});

      const result = await checkScheduledTransitions();
      expect(result).toBe(1);
      expect(mockTransitionCampaign).toHaveBeenCalledTimes(2);
    });
  });
});
