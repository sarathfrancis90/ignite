import type {
  GraduationMetrics,
  GraduationProgress,
  GraduationThresholds,
} from "@/types/idea";
import { differenceInDays } from "date-fns";

export interface GraduationDeps {
  getIdeaMetrics: (ideaId: string) => Promise<{
    viewCount: number;
    likeCount: number;
    status: string;
    communityDiscussionStartedAt: Date | null;
    campaignId: string | null;
  }>;
  getUniqueCommenters: (ideaId: string) => Promise<number>;
  getUniqueVoters: (ideaId: string) => Promise<number>;
  getAvgVoteScore: (ideaId: string) => Promise<number>;
  getCampaignThresholds: (campaignId: string) => Promise<GraduationThresholds>;
  transitionToHot: (ideaId: string, actorId: string) => Promise<void>;
}

export function calculateGraduationProgress(
  thresholds: GraduationThresholds,
  metrics: GraduationMetrics,
): GraduationProgress {
  const progress: GraduationProgress["progress"] = {
    visitors: {
      current: metrics.viewCount,
      target: thresholds.visitors,
      met:
        thresholds.visitors === 0 || metrics.viewCount >= thresholds.visitors,
    },
    commenters: {
      current: metrics.uniqueCommenters,
      target: thresholds.commenters,
      met:
        thresholds.commenters === 0 ||
        metrics.uniqueCommenters >= thresholds.commenters,
    },
    voters: {
      current: metrics.uniqueVoters,
      target: thresholds.voters,
      met: thresholds.voters === 0 || metrics.uniqueVoters >= thresholds.voters,
    },
    votingLevel: {
      current: metrics.avgVoteScore,
      target: thresholds.votingLevel,
      met:
        thresholds.votingLevel === 0 ||
        metrics.avgVoteScore >= thresholds.votingLevel,
    },
    likes: {
      current: metrics.likeCount,
      target: thresholds.likes,
      met: thresholds.likes === 0 || metrics.likeCount >= thresholds.likes,
    },
    daysInStatus: {
      current: metrics.daysInStatus,
      target: thresholds.daysInStatus,
      met:
        thresholds.daysInStatus === 0 ||
        metrics.daysInStatus >= thresholds.daysInStatus,
    },
  };

  const isMet = Object.values(progress).every((p) => p.met);

  return {
    thresholds,
    current: metrics,
    isMet,
    progress,
  };
}

export async function checkGraduation(
  ideaId: string,
  deps: GraduationDeps,
): Promise<GraduationProgress | null> {
  const ideaMetrics = await deps.getIdeaMetrics(ideaId);

  if (ideaMetrics.status !== "COMMUNITY_DISCUSSION") {
    return null;
  }

  if (!ideaMetrics.campaignId) {
    return null;
  }

  const thresholds = await deps.getCampaignThresholds(ideaMetrics.campaignId);
  const [uniqueCommenters, uniqueVoters, avgVoteScore] = await Promise.all([
    deps.getUniqueCommenters(ideaId),
    deps.getUniqueVoters(ideaId),
    deps.getAvgVoteScore(ideaId),
  ]);

  const daysInStatus = ideaMetrics.communityDiscussionStartedAt
    ? differenceInDays(new Date(), ideaMetrics.communityDiscussionStartedAt)
    : 0;

  const metrics: GraduationMetrics = {
    viewCount: ideaMetrics.viewCount,
    uniqueCommenters,
    uniqueVoters,
    avgVoteScore,
    likeCount: ideaMetrics.likeCount,
    daysInStatus,
  };

  const progress = calculateGraduationProgress(thresholds, metrics);

  if (progress.isMet) {
    await deps.transitionToHot(ideaId, "system");
  }

  return progress;
}

export async function getGraduationProgress(
  ideaId: string,
  deps: Omit<GraduationDeps, "transitionToHot">,
): Promise<GraduationProgress | null> {
  const ideaMetrics = await deps.getIdeaMetrics(ideaId);

  if (!ideaMetrics.campaignId) {
    return null;
  }

  const thresholds = await deps.getCampaignThresholds(ideaMetrics.campaignId);
  const [uniqueCommenters, uniqueVoters, avgVoteScore] = await Promise.all([
    deps.getUniqueCommenters(ideaId),
    deps.getUniqueVoters(ideaId),
    deps.getAvgVoteScore(ideaId),
  ]);

  const daysInStatus = ideaMetrics.communityDiscussionStartedAt
    ? differenceInDays(new Date(), ideaMetrics.communityDiscussionStartedAt)
    : 0;

  const metrics: GraduationMetrics = {
    viewCount: ideaMetrics.viewCount,
    uniqueCommenters,
    uniqueVoters,
    avgVoteScore,
    likeCount: ideaMetrics.likeCount,
    daysInStatus,
  };

  return calculateGraduationProgress(thresholds, metrics);
}
