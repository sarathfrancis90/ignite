import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  transitionIdea,
  unarchiveIdea,
  getAvailableTransitions,
  isTransitionAllowed,
  TransitionError,
} from "./idea-transitions";
import { IdeaStatus, CampaignStatus } from "@/shared/types/enums";
import type {
  IdeaContext,
  CampaignContext,
  IdeaTransitionContext,
  CoachFeedback,
} from "@/shared/types/idea";
import { eventBus } from "@/server/lib/events/event-bus";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeIdea(overrides: Partial<IdeaContext> = {}): IdeaContext {
  return {
    id: "idea-1",
    status: IdeaStatus.DRAFT,
    campaignId: "campaign-1",
    channelId: null,
    contributorId: "user-contributor",
    ideaCoachId: "user-coach",
    archiveReason: null,
    isHot: false,
    ...overrides,
  };
}

function makeCampaign(
  overrides: Partial<CampaignContext> = {},
): CampaignContext {
  return {
    id: "campaign-1",
    status: CampaignStatus.SUBMISSION,
    hasQualificationPhase: true,
    hasDiscussionPhase: true,
    ...overrides,
  };
}

function makeCtx(
  overrides: Partial<IdeaTransitionContext> = {},
): IdeaTransitionContext {
  return {
    idea: makeIdea(),
    campaign: makeCampaign(),
    actorId: "user-contributor",
    actorRoles: ["MANAGER"],
    ...overrides,
  };
}

function approvalFeedback(
  overrides: Partial<CoachFeedback> = {},
): CoachFeedback {
  return {
    decision: "APPROVE",
    feedback: "Great idea, well thought out!",
    strengths: "Clear problem statement",
    improvements: "Consider budget implications",
    ...overrides,
  };
}

function rejectionFeedback(
  overrides: Partial<CoachFeedback> = {},
): CoachFeedback {
  return {
    decision: "REJECT",
    feedback: "Needs more work on feasibility",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Idea Lifecycle State Machine", () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  // =========================================================================
  // Happy path transitions
  // =========================================================================

  describe("Happy path: DRAFT → QUALIFICATION → COMMUNITY_DISCUSSION → HOT → EVALUATION → SELECTED_IMPLEMENTATION → IMPLEMENTED", () => {
    it("DRAFT → QUALIFICATION (campaign with qualification)", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-contributor",
      });

      const result = transitionIdea(ctx, IdeaStatus.QUALIFICATION);

      expect(result.previousStatus).toBe(IdeaStatus.DRAFT);
      expect(result.newStatus).toBe(IdeaStatus.QUALIFICATION);
      expect(result.ideaId).toBe("idea-1");
    });

    it("QUALIFICATION → COMMUNITY_DISCUSSION (coach approves)", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-coach",
        coachFeedback: approvalFeedback(),
      });

      const result = transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.newStatus).toBe(IdeaStatus.COMMUNITY_DISCUSSION);
      expect(result.coachFeedback?.decision).toBe("APPROVE");
    });

    it("COMMUNITY_DISCUSSION → HOT (manager promotes)", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.DISCUSSION_VOTING }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.HOT);

      expect(result.newStatus).toBe(IdeaStatus.HOT);
    });

    it("HOT → EVALUATION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.HOT, isHot: true }),
        campaign: makeCampaign({ status: CampaignStatus.EVALUATION }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.EVALUATION);

      expect(result.newStatus).toBe(IdeaStatus.EVALUATION);
    });

    it("EVALUATION → SELECTED_IMPLEMENTATION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.EVALUATION }),
        campaign: makeCampaign({ status: CampaignStatus.EVALUATION }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.SELECTED_IMPLEMENTATION);

      expect(result.newStatus).toBe(IdeaStatus.SELECTED_IMPLEMENTATION);
    });

    it("SELECTED_IMPLEMENTATION → IMPLEMENTED", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.SELECTED_IMPLEMENTATION }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.IMPLEMENTED);

      expect(result.newStatus).toBe(IdeaStatus.IMPLEMENTED);
    });
  });

  // =========================================================================
  // Skip qualification (no qualification phase)
  // =========================================================================

  describe("Skip qualification path", () => {
    it("DRAFT → COMMUNITY_DISCUSSION when campaign has no qualification", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: false }),
        actorId: "user-contributor",
      });

      const result = transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.newStatus).toBe(IdeaStatus.COMMUNITY_DISCUSSION);
    });

    it("DRAFT → QUALIFICATION blocked when campaign has no qualification phase", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: false }),
        actorId: "user-contributor",
      });

      expect(() => transitionIdea(ctx, IdeaStatus.QUALIFICATION)).toThrow(
        TransitionError,
      );
    });

    it("DRAFT → COMMUNITY_DISCUSSION blocked when campaign requires qualification", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-contributor",
      });

      expect(() =>
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      ).toThrow(TransitionError);
    });
  });

  // =========================================================================
  // Channel ideas (no campaign)
  // =========================================================================

  describe("Channel ideas (no campaign)", () => {
    it("DRAFT → COMMUNITY_DISCUSSION without campaign", () => {
      const ctx = makeCtx({
        idea: makeIdea({
          status: IdeaStatus.DRAFT,
          campaignId: null,
          channelId: "channel-1",
        }),
        campaign: null,
        actorId: "user-contributor",
      });

      const result = transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.newStatus).toBe(IdeaStatus.COMMUNITY_DISCUSSION);
    });

    it("channel ideas skip campaign phase checks", () => {
      const ctx = makeCtx({
        idea: makeIdea({
          status: IdeaStatus.COMMUNITY_DISCUSSION,
          campaignId: null,
          channelId: "channel-1",
        }),
        campaign: null,
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.HOT);

      expect(result.newStatus).toBe(IdeaStatus.HOT);
    });
  });

  // =========================================================================
  // Campaign phase coupling
  // =========================================================================

  describe("Campaign phase coupling", () => {
    it("blocks HOT transition when campaign is in SUBMISSION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.SUBMISSION }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.HOT)).toThrow(
        TransitionError,
      );
    });

    it("blocks EVALUATION when campaign is in DISCUSSION_VOTING", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.HOT }),
        campaign: makeCampaign({ status: CampaignStatus.DISCUSSION_VOTING }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.EVALUATION)).toThrow(
        TransitionError,
      );
    });

    it("allows EVALUATION when campaign is in EVALUATION phase", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.HOT }),
        campaign: makeCampaign({ status: CampaignStatus.EVALUATION }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.EVALUATION);
      expect(result.newStatus).toBe(IdeaStatus.EVALUATION);
    });

    it("allows EVALUATION when campaign is CLOSED", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.HOT }),
        campaign: makeCampaign({ status: CampaignStatus.CLOSED }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.EVALUATION);
      expect(result.newStatus).toBe(IdeaStatus.EVALUATION);
    });

    it("blocks SELECTED_CONCEPT when campaign is in SUBMISSION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.EVALUATION }),
        campaign: makeCampaign({ status: CampaignStatus.SUBMISSION }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.SELECTED_CONCEPT)).toThrow(
        TransitionError,
      );
    });
  });

  // =========================================================================
  // Coach qualification
  // =========================================================================

  describe("Coach qualification", () => {
    it("coach approves → COMMUNITY_DISCUSSION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: approvalFeedback(),
      });

      const result = transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.newStatus).toBe(IdeaStatus.COMMUNITY_DISCUSSION);
    });

    it("coach rejects → DRAFT", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: rejectionFeedback(),
      });

      const result = transitionIdea(ctx, IdeaStatus.DRAFT);

      expect(result.newStatus).toBe(IdeaStatus.DRAFT);
    });

    it("coach requests changes → DRAFT", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: {
          decision: "REQUEST_CHANGES",
          feedback: "Please add more details about the solution",
        },
      });

      const result = transitionIdea(ctx, IdeaStatus.DRAFT);

      expect(result.newStatus).toBe(IdeaStatus.DRAFT);
    });

    it("blocks COMMUNITY_DISCUSSION without coach feedback", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
      });

      expect(() =>
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      ).toThrow(TransitionError);
    });

    it("blocks COMMUNITY_DISCUSSION when coach rejects", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: rejectionFeedback(),
      });

      expect(() =>
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      ).toThrow(TransitionError);
    });

    it("blocks DRAFT rejection without feedback", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
      });

      expect(() => transitionIdea(ctx, IdeaStatus.DRAFT)).toThrow(
        TransitionError,
      );
    });

    it("blocks DRAFT rejection when coach approved", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: approvalFeedback(),
      });

      expect(() => transitionIdea(ctx, IdeaStatus.DRAFT)).toThrow(
        TransitionError,
      );
    });
  });

  // =========================================================================
  // Archive / Unarchive
  // =========================================================================

  describe("Archive", () => {
    const archivableStatuses = [
      IdeaStatus.DRAFT,
      IdeaStatus.QUALIFICATION,
      IdeaStatus.COMMUNITY_DISCUSSION,
      IdeaStatus.HOT,
      IdeaStatus.EVALUATION,
      IdeaStatus.SELECTED_CONCEPT,
      IdeaStatus.SELECTED_IMPLEMENTATION,
      IdeaStatus.IMPLEMENTED,
    ];

    for (const status of archivableStatuses) {
      it(`can archive from ${status}`, () => {
        const ctx = makeCtx({
          idea: makeIdea({ status }),
          actorRoles: ["MANAGER"],
          reason: "No longer relevant",
        });

        const result = transitionIdea(ctx, IdeaStatus.ARCHIVED);

        expect(result.newStatus).toBe(IdeaStatus.ARCHIVED);
        expect(result.previousStatus).toBe(status);
      });
    }

    it("requires reason for archiving", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.ARCHIVED)).toThrow(
        TransitionError,
      );
    });
  });

  describe("Unarchive", () => {
    it("restores to previous status", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        actorRoles: ["MANAGER"],
        reason: "Revisiting this idea",
      });

      const result = unarchiveIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.previousStatus).toBe(IdeaStatus.ARCHIVED);
      expect(result.newStatus).toBe(IdeaStatus.COMMUNITY_DISCUSSION);
    });

    it("blocks unarchive if not archived", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        actorRoles: ["MANAGER"],
      });

      expect(() => unarchiveIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION)).toThrow(
        TransitionError,
      );
    });

    it("blocks unarchive to ARCHIVED", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        actorRoles: ["MANAGER"],
      });

      expect(() => unarchiveIdea(ctx, IdeaStatus.ARCHIVED)).toThrow(
        TransitionError,
      );
    });

    it("requires manager role", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        actorRoles: ["CONTRIBUTOR"],
      });

      expect(() => unarchiveIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION)).toThrow(
        TransitionError,
      );
    });

    it("checks campaign phase on unarchive", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        campaign: makeCampaign({ status: CampaignStatus.SUBMISSION }),
        actorRoles: ["MANAGER"],
      });

      expect(() => unarchiveIdea(ctx, IdeaStatus.EVALUATION)).toThrow(
        TransitionError,
      );
    });
  });

  // =========================================================================
  // Permissions
  // =========================================================================

  describe("Permissions", () => {
    it("contributor can submit their own draft", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-contributor",
        actorRoles: ["CONTRIBUTOR"],
      });

      const result = transitionIdea(ctx, IdeaStatus.QUALIFICATION);

      expect(result.newStatus).toBe(IdeaStatus.QUALIFICATION);
    });

    it("non-contributor cannot submit someone else's draft", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-other",
        actorRoles: ["CONTRIBUTOR"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.QUALIFICATION)).toThrow(
        TransitionError,
      );
    });

    it("coach can handle qualification for their assigned idea", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        actorRoles: ["IDEA_COACH"],
        coachFeedback: approvalFeedback(),
      });

      const result = transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.newStatus).toBe(IdeaStatus.COMMUNITY_DISCUSSION);
    });

    it("non-coach cannot handle qualification", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-random",
        actorRoles: ["CONTRIBUTOR"],
        coachFeedback: approvalFeedback(),
      });

      expect(() =>
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      ).toThrow(TransitionError);
    });

    it("INNOVATION_MANAGER can perform transitions", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.DISCUSSION_VOTING }),
        actorRoles: ["INNOVATION_MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.HOT);

      expect(result.newStatus).toBe(IdeaStatus.HOT);
    });

    it("PLATFORM_ADMIN can perform transitions", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.DISCUSSION_VOTING }),
        actorRoles: ["PLATFORM_ADMIN"],
      });

      const result = transitionIdea(ctx, IdeaStatus.HOT);

      expect(result.newStatus).toBe(IdeaStatus.HOT);
    });

    it("regular contributor cannot promote to HOT", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.DISCUSSION_VOTING }),
        actorId: "user-random",
        actorRoles: ["CONTRIBUTOR"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.HOT)).toThrow(
        TransitionError,
      );
    });
  });

  // =========================================================================
  // Invalid transitions
  // =========================================================================

  describe("Invalid transitions", () => {
    it("cannot go from DRAFT to HOT", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.HOT)).toThrow(
        TransitionError,
      );
    });

    it("cannot go from DRAFT to EVALUATION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.EVALUATION)).toThrow(
        TransitionError,
      );
    });

    it("cannot go from IMPLEMENTED to DRAFT", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.IMPLEMENTED }),
        actorRoles: ["MANAGER"],
      });

      expect(() => transitionIdea(ctx, IdeaStatus.DRAFT)).toThrow(
        TransitionError,
      );
    });

    it("cannot transition from ARCHIVED via transitionIdea", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        actorRoles: ["MANAGER"],
      });

      expect(() =>
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION),
      ).toThrow(TransitionError);
    });

    it("IMPLEMENTATION_CANCELED can retry to SELECTED_IMPLEMENTATION", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.IMPLEMENTATION_CANCELED }),
        campaign: makeCampaign({ status: CampaignStatus.EVALUATION }),
        actorRoles: ["MANAGER"],
      });

      const result = transitionIdea(ctx, IdeaStatus.SELECTED_IMPLEMENTATION);

      expect(result.newStatus).toBe(IdeaStatus.SELECTED_IMPLEMENTATION);
    });
  });

  // =========================================================================
  // EventBus emissions
  // =========================================================================

  describe("EventBus emissions", () => {
    it("emits idea.statusChanged on every transition", () => {
      const handler = vi.fn();
      eventBus.on("idea.statusChanged", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-contributor",
      });

      transitionIdea(ctx, IdeaStatus.QUALIFICATION);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          previousStatus: IdeaStatus.DRAFT,
          newStatus: IdeaStatus.QUALIFICATION,
          actorId: "user-contributor",
          campaignId: "campaign-1",
        }),
      );
    });

    it("emits idea.published when DRAFT → COMMUNITY_DISCUSSION", () => {
      const handler = vi.fn();
      eventBus.on("idea.published", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: false }),
        actorId: "user-contributor",
      });

      transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          contributorId: "user-contributor",
        }),
      );
    });

    it("emits idea.published when QUALIFICATION → COMMUNITY_DISCUSSION", () => {
      const handler = vi.fn();
      eventBus.on("idea.published", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: approvalFeedback(),
      });

      transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("emits idea.archived when archiving", () => {
      const handler = vi.fn();
      eventBus.on("idea.archived", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        actorRoles: ["MANAGER"],
        reason: "Duplicate idea",
      });

      transitionIdea(ctx, IdeaStatus.ARCHIVED);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          previousStatus: IdeaStatus.COMMUNITY_DISCUSSION,
          reason: "Duplicate idea",
        }),
      );
    });

    it("emits idea.coachQualification when coach decides", () => {
      const handler = vi.fn();
      eventBus.on("idea.coachQualification", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: approvalFeedback(),
      });

      transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          coachId: "user-coach",
          decision: "APPROVE",
        }),
      );
    });

    it("emits idea.unarchived on unarchive", () => {
      const handler = vi.fn();
      eventBus.on("idea.unarchived", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        actorRoles: ["MANAGER"],
      });

      unarchiveIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          restoredStatus: IdeaStatus.COMMUNITY_DISCUSSION,
        }),
      );
    });

    it("emits idea.statusChanged on unarchive", () => {
      const handler = vi.fn();
      eventBus.on("idea.statusChanged", handler);

      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.ARCHIVED }),
        actorRoles: ["MANAGER"],
      });

      unarchiveIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          previousStatus: IdeaStatus.ARCHIVED,
          newStatus: IdeaStatus.COMMUNITY_DISCUSSION,
        }),
      );
    });
  });

  // =========================================================================
  // Query helpers
  // =========================================================================

  describe("getAvailableTransitions", () => {
    it("returns allowed transitions for DRAFT", () => {
      const transitions = getAvailableTransitions(IdeaStatus.DRAFT);

      expect(transitions).toContain(IdeaStatus.QUALIFICATION);
      expect(transitions).toContain(IdeaStatus.COMMUNITY_DISCUSSION);
      expect(transitions).toContain(IdeaStatus.ARCHIVED);
      expect(transitions).toHaveLength(3);
    });

    it("returns empty for ARCHIVED", () => {
      const transitions = getAvailableTransitions(IdeaStatus.ARCHIVED);

      expect(transitions).toEqual([]);
    });

    it("returns allowed transitions for EVALUATION", () => {
      const transitions = getAvailableTransitions(IdeaStatus.EVALUATION);

      expect(transitions).toContain(IdeaStatus.SELECTED_CONCEPT);
      expect(transitions).toContain(IdeaStatus.SELECTED_IMPLEMENTATION);
      expect(transitions).toContain(IdeaStatus.ARCHIVED);
    });
  });

  describe("isTransitionAllowed", () => {
    it("returns true for valid transitions", () => {
      expect(
        isTransitionAllowed(IdeaStatus.DRAFT, IdeaStatus.QUALIFICATION),
      ).toBe(true);
      expect(
        isTransitionAllowed(IdeaStatus.COMMUNITY_DISCUSSION, IdeaStatus.HOT),
      ).toBe(true);
    });

    it("returns false for invalid transitions", () => {
      expect(isTransitionAllowed(IdeaStatus.DRAFT, IdeaStatus.HOT)).toBe(false);
      expect(
        isTransitionAllowed(IdeaStatus.IMPLEMENTED, IdeaStatus.DRAFT),
      ).toBe(false);
    });

    it("returns false for any transition from ARCHIVED", () => {
      expect(
        isTransitionAllowed(
          IdeaStatus.ARCHIVED,
          IdeaStatus.COMMUNITY_DISCUSSION,
        ),
      ).toBe(false);
    });
  });

  // =========================================================================
  // TransitionResult structure
  // =========================================================================

  describe("TransitionResult", () => {
    it("includes all required fields", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-contributor",
      });

      const result = transitionIdea(ctx, IdeaStatus.QUALIFICATION);

      expect(result).toMatchObject({
        previousStatus: IdeaStatus.DRAFT,
        newStatus: IdeaStatus.QUALIFICATION,
        ideaId: "idea-1",
        actorId: "user-contributor",
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("includes reason when provided", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        actorRoles: ["MANAGER"],
        reason: "Duplicate of idea-42",
      });

      const result = transitionIdea(ctx, IdeaStatus.ARCHIVED);

      expect(result.reason).toBe("Duplicate of idea-42");
    });

    it("includes coachFeedback when provided", () => {
      const feedback = approvalFeedback();
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
        coachFeedback: feedback,
      });

      const result = transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);

      expect(result.coachFeedback).toEqual(feedback);
    });
  });

  // =========================================================================
  // Error codes
  // =========================================================================

  describe("TransitionError codes", () => {
    it("INVALID_TRANSITION for disallowed paths", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        actorRoles: ["MANAGER"],
      });

      try {
        transitionIdea(ctx, IdeaStatus.HOT);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("INVALID_TRANSITION");
      }
    });

    it("CAMPAIGN_PHASE_MISMATCH when campaign not ready", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.SUBMISSION }),
        actorRoles: ["MANAGER"],
      });

      try {
        transitionIdea(ctx, IdeaStatus.HOT);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("CAMPAIGN_PHASE_MISMATCH");
      }
    });

    it("QUALIFICATION_REQUIRED when skipping qualification", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        campaign: makeCampaign({ hasQualificationPhase: true }),
        actorId: "user-contributor",
      });

      try {
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("QUALIFICATION_REQUIRED");
      }
    });

    it("COACH_FEEDBACK_REQUIRED when no feedback", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.QUALIFICATION }),
        actorId: "user-coach",
      });

      try {
        transitionIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("COACH_FEEDBACK_REQUIRED");
      }
    });

    it("ARCHIVE_REASON_REQUIRED when no reason", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        actorRoles: ["MANAGER"],
      });

      try {
        transitionIdea(ctx, IdeaStatus.ARCHIVED);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("ARCHIVE_REASON_REQUIRED");
      }
    });

    it("INSUFFICIENT_PERMISSIONS for unauthorized users", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.COMMUNITY_DISCUSSION }),
        campaign: makeCampaign({ status: CampaignStatus.DISCUSSION_VOTING }),
        actorId: "user-random",
        actorRoles: ["CONTRIBUTOR"],
      });

      try {
        transitionIdea(ctx, IdeaStatus.HOT);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("INSUFFICIENT_PERMISSIONS");
      }
    });

    it("NOT_ARCHIVED when unarchiving non-archived idea", () => {
      const ctx = makeCtx({
        idea: makeIdea({ status: IdeaStatus.DRAFT }),
        actorRoles: ["MANAGER"],
      });

      try {
        unarchiveIdea(ctx, IdeaStatus.COMMUNITY_DISCUSSION);
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TransitionError);
        expect((err as TransitionError).code).toBe("NOT_ARCHIVED");
      }
    });
  });
});
