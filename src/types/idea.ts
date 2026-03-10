export const IdeaStatus = {
  DRAFT: "DRAFT",
  QUALIFICATION: "QUALIFICATION",
  COMMUNITY_DISCUSSION: "COMMUNITY_DISCUSSION",
  HOT: "HOT",
  EVALUATION: "EVALUATION",
  SELECTED_CONCEPT: "SELECTED_CONCEPT",
  SELECTED_IMPLEMENTATION: "SELECTED_IMPLEMENTATION",
  IMPLEMENTED: "IMPLEMENTED",
  IMPLEMENTATION_CANCELED: "IMPLEMENTATION_CANCELED",
  ARCHIVED: "ARCHIVED",
} as const;

export type IdeaStatus = (typeof IdeaStatus)[keyof typeof IdeaStatus];

export interface GraduationThresholds {
  visitors: number;
  commenters: number;
  voters: number;
  votingLevel: number;
  likes: number;
  daysInStatus: number;
}

export interface GraduationMetrics {
  viewCount: number;
  uniqueCommenters: number;
  uniqueVoters: number;
  avgVoteScore: number;
  likeCount: number;
  daysInStatus: number;
}

export interface GraduationProgress {
  thresholds: GraduationThresholds;
  current: GraduationMetrics;
  isMet: boolean;
  progress: Record<
    keyof GraduationThresholds,
    { current: number; target: number; met: boolean }
  >;
}

export interface IdeaDetail {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  isHot: boolean;
  hotAt: string | null;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  voteCount: number;
  avgVoteScore: number | null;
  contributorId: string;
  campaignId: string | null;
  channelId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}
