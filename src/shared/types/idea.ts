import { IdeaStatus, CampaignStatus } from "./enums";

/**
 * Minimal idea data required by the state machine for transition logic.
 * This avoids coupling to Prisma types while providing all needed fields.
 */
export interface IdeaContext {
  id: string;
  status: IdeaStatus;
  campaignId: string | null;
  channelId: string | null;
  contributorId: string;
  ideaCoachId: string | null;
  archiveReason: string | null;
  isHot: boolean;
}

/**
 * Minimal campaign data required for idea transition guards.
 */
export interface CampaignContext {
  id: string;
  status: CampaignStatus;
  hasQualificationPhase: boolean;
  hasDiscussionPhase: boolean;
}

/**
 * Context provided when performing an idea transition.
 */
export interface IdeaTransitionContext {
  idea: IdeaContext;
  campaign: CampaignContext | null;
  actorId: string;
  actorRoles: string[];
  reason?: string;
  coachFeedback?: CoachFeedback;
}

/**
 * Coach qualification feedback attached to QUALIFICATION transitions.
 */
export interface CoachFeedback {
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  feedback: string;
  strengths?: string;
  improvements?: string;
}

/**
 * Result of a successful transition.
 */
export interface TransitionResult {
  previousStatus: IdeaStatus;
  newStatus: IdeaStatus;
  ideaId: string;
  actorId: string;
  timestamp: Date;
  reason?: string;
  coachFeedback?: CoachFeedback;
}
