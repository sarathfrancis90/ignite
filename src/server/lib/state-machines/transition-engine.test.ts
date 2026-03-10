import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { evaluateTransitionGuards } from "./transition-engine";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaignMember: {
      count: vi.fn(),
    },
    idea: {
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

const { prisma } = await import("@/server/lib/prisma");

const campaignMemberCount = prisma.campaignMember.count as unknown as Mock;
const ideaCount = (prisma as unknown as { idea: { count: Mock } }).idea.count;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transition-engine", () => {
  describe("evaluateTransitionGuards", () => {
    it("returns empty array for transitions without guards", async () => {
      const failures = await evaluateTransitionGuards("campaign-1", "DRAFT", "SUBMISSION");
      expect(failures).toEqual([]);
    });

    it("returns empty array for SEEDING transition when seeders assigned", async () => {
      campaignMemberCount.mockResolvedValue(2);

      const failures = await evaluateTransitionGuards("campaign-1", "DRAFT", "SEEDING");
      expect(failures).toEqual([]);
      expect(campaignMemberCount).toHaveBeenCalledWith({
        where: {
          campaignId: "campaign-1",
          role: "CAMPAIGN_SEEDER",
        },
      });
    });

    it("returns failure for SEEDING transition when no seeders assigned", async () => {
      campaignMemberCount.mockResolvedValue(0);

      const failures = await evaluateTransitionGuards("campaign-1", "DRAFT", "SEEDING");
      expect(failures).toHaveLength(1);
      expect(failures[0]?.guard).toBe("SEEDING_TEAM_ASSIGNED");
      expect(failures[0]?.message).toContain("seeding team");
    });

    it("returns empty array for SUBMISSION -> DISCUSSION_VOTING when ideas exist", async () => {
      ideaCount.mockResolvedValue(3);

      const failures = await evaluateTransitionGuards(
        "campaign-1",
        "SUBMISSION",
        "DISCUSSION_VOTING",
      );
      expect(failures).toEqual([]);
    });

    it("returns failure for SUBMISSION -> DISCUSSION_VOTING when no ideas exist", async () => {
      ideaCount.mockResolvedValue(0);

      const failures = await evaluateTransitionGuards(
        "campaign-1",
        "SUBMISSION",
        "DISCUSSION_VOTING",
      );
      expect(failures).toHaveLength(1);
      expect(failures[0]?.guard).toBe("HAS_AT_LEAST_ONE_IDEA");
    });

    it("returns empty array for EVALUATION -> CLOSED (evaluation guard passes by default)", async () => {
      const failures = await evaluateTransitionGuards("campaign-1", "EVALUATION", "CLOSED");
      expect(failures).toEqual([]);
    });

    it("returns empty array for SEEDING -> SUBMISSION (no guards)", async () => {
      const failures = await evaluateTransitionGuards("campaign-1", "SEEDING", "SUBMISSION");
      expect(failures).toEqual([]);
    });
  });
});
