import { describe, expect, it, vi } from "vitest";
import {
  calculateGraduationProgress,
  checkGraduation,
  type GraduationDeps,
} from "./graduation.service";
import type { GraduationMetrics, GraduationThresholds } from "@/types/idea";

function makeThresholds(
  overrides: Partial<GraduationThresholds> = {},
): GraduationThresholds {
  return {
    visitors: 10,
    commenters: 5,
    voters: 3,
    votingLevel: 3.0,
    likes: 5,
    daysInStatus: 0,
    ...overrides,
  };
}

function makeMetrics(
  overrides: Partial<GraduationMetrics> = {},
): GraduationMetrics {
  return {
    viewCount: 0,
    uniqueCommenters: 0,
    uniqueVoters: 0,
    avgVoteScore: 0,
    likeCount: 0,
    daysInStatus: 0,
    ...overrides,
  };
}

describe("calculateGraduationProgress", () => {
  it("returns all thresholds as met when all metrics exceed thresholds", () => {
    const thresholds = makeThresholds();
    const metrics = makeMetrics({
      viewCount: 20,
      uniqueCommenters: 10,
      uniqueVoters: 5,
      avgVoteScore: 4.0,
      likeCount: 10,
    });

    const result = calculateGraduationProgress(thresholds, metrics);
    expect(result.isMet).toBe(true);
    expect(result.progress.visitors.met).toBe(true);
    expect(result.progress.commenters.met).toBe(true);
    expect(result.progress.voters.met).toBe(true);
    expect(result.progress.votingLevel.met).toBe(true);
    expect(result.progress.likes.met).toBe(true);
  });

  it("returns not met when some thresholds are unmet", () => {
    const thresholds = makeThresholds();
    const metrics = makeMetrics({
      viewCount: 20,
      uniqueCommenters: 2,
      uniqueVoters: 5,
      avgVoteScore: 4.0,
      likeCount: 10,
    });

    const result = calculateGraduationProgress(thresholds, metrics);
    expect(result.isMet).toBe(false);
    expect(result.progress.visitors.met).toBe(true);
    expect(result.progress.commenters.met).toBe(false);
  });

  it("treats zero-threshold as automatically met", () => {
    const thresholds = makeThresholds({
      voters: 0,
      votingLevel: 0,
      likes: 0,
      daysInStatus: 0,
    });
    const metrics = makeMetrics({
      viewCount: 10,
      uniqueCommenters: 5,
    });

    const result = calculateGraduationProgress(thresholds, metrics);
    expect(result.progress.voters.met).toBe(true);
    expect(result.progress.votingLevel.met).toBe(true);
    expect(result.progress.likes.met).toBe(true);
    expect(result.progress.daysInStatus.met).toBe(true);
    expect(result.isMet).toBe(true);
  });

  it("includes correct current and target values", () => {
    const thresholds = makeThresholds({ visitors: 15 });
    const metrics = makeMetrics({ viewCount: 8 });

    const result = calculateGraduationProgress(thresholds, metrics);
    expect(result.progress.visitors.current).toBe(8);
    expect(result.progress.visitors.target).toBe(15);
    expect(result.progress.visitors.met).toBe(false);
  });
});

describe("checkGraduation", () => {
  function makeDeps(overrides: Partial<GraduationDeps> = {}): GraduationDeps {
    return {
      getIdeaMetrics: vi.fn().mockResolvedValue({
        viewCount: 20,
        likeCount: 10,
        status: "COMMUNITY_DISCUSSION",
        communityDiscussionStartedAt: new Date("2026-01-01"),
        campaignId: "campaign-1",
      }),
      getUniqueCommenters: vi.fn().mockResolvedValue(10),
      getUniqueVoters: vi.fn().mockResolvedValue(5),
      getAvgVoteScore: vi.fn().mockResolvedValue(4.0),
      getCampaignThresholds: vi.fn().mockResolvedValue(
        makeThresholds({
          voters: 0,
          votingLevel: 0,
          likes: 0,
          daysInStatus: 0,
        }),
      ),
      transitionToHot: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("triggers graduation when all thresholds are met", async () => {
    const deps = makeDeps();
    const result = await checkGraduation("idea-1", deps);

    expect(result).not.toBeNull();
    expect(result?.isMet).toBe(true);
    expect(deps.transitionToHot).toHaveBeenCalledWith("idea-1", "system");
  });

  it("does not graduate when idea is not in COMMUNITY_DISCUSSION", async () => {
    const deps = makeDeps({
      getIdeaMetrics: vi.fn().mockResolvedValue({
        viewCount: 20,
        likeCount: 10,
        status: "DRAFT",
        communityDiscussionStartedAt: null,
        campaignId: "campaign-1",
      }),
    });

    const result = await checkGraduation("idea-1", deps);
    expect(result).toBeNull();
    expect(deps.transitionToHot).not.toHaveBeenCalled();
  });

  it("does not graduate when campaign is missing", async () => {
    const deps = makeDeps({
      getIdeaMetrics: vi.fn().mockResolvedValue({
        viewCount: 20,
        likeCount: 10,
        status: "COMMUNITY_DISCUSSION",
        communityDiscussionStartedAt: new Date(),
        campaignId: null,
      }),
    });

    const result = await checkGraduation("idea-1", deps);
    expect(result).toBeNull();
    expect(deps.transitionToHot).not.toHaveBeenCalled();
  });

  it("does not graduate when thresholds are not met", async () => {
    const deps = makeDeps({
      getUniqueCommenters: vi.fn().mockResolvedValue(1),
      getCampaignThresholds: vi.fn().mockResolvedValue(makeThresholds()),
    });

    const result = await checkGraduation("idea-1", deps);
    expect(result).not.toBeNull();
    expect(result?.isMet).toBe(false);
    expect(deps.transitionToHot).not.toHaveBeenCalled();
  });
});
