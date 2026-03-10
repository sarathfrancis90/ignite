"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ClipboardList, GraduationCap, Users, Settings, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { WIZARD_STEPS } from "@/types/campaign-wizard";
import type {
  WizardStepId,
  StepIdeaCoachData,
  StepCommunityData,
  StepSettingsData,
} from "@/types/campaign-wizard";
import type { PickedUser } from "@/components/shared/UserPicker";
import { StepDescription } from "./wizard/StepDescription";
import { StepSubmissionForm } from "./wizard/StepSubmissionForm";
import { StepIdeaCoach } from "./wizard/StepIdeaCoach";
import { StepCommunity } from "./wizard/StepCommunity";
import { StepSettings } from "./wizard/StepSettings";

const STEP_ICONS = [FileText, ClipboardList, GraduationCap, Users, Settings] as const;

interface CampaignData {
  id: string;
  title: string;
  teaser: string | null;
  description: string | null;
  bannerUrl: string | null;
  videoUrl: string | null;
  status: string;
  submissionCloseDate: string | null;
  votingCloseDate: string | null;
  plannedCloseDate: string | null;
  customFields: unknown;
  settings: unknown;
  hasIdeaCoach: boolean;
  coachAssignmentMode: string;
  ideaCategories: unknown;
  audienceType: string;
  hasQualificationPhase: boolean;
  hasVoting: boolean;
  votingCriteria: unknown;
  graduationVisitors: number;
  graduationCommenters: number;
  graduationVoters: number;
  graduationVotingLevel: number;
  graduationDaysInStatus: number;
  isConfidentialAllowed: boolean;
  isShowOnStartPage: boolean;
}

interface CampaignWizardProps {
  campaign: CampaignData;
}

export function CampaignWizard({ campaign }: CampaignWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<WizardStepId>(1);
  const [completedSteps, setCompletedSteps] = React.useState<Set<WizardStepId>>(new Set());

  const utils = trpc.useUtils();
  const updateMutation = trpc.campaign.update.useMutation({
    onSuccess: () => {
      utils.campaign.getById.invalidate({ id: campaign.id });
    },
  });

  const setMembersMutation = trpc.campaign.setMembers.useMutation({
    onSuccess: () => {
      utils.campaign.listMembers.invalidate({ campaignId: campaign.id });
    },
  });

  // Fetch current campaign members
  const { data: campaignMembers } = trpc.campaign.listMembers.useQuery({
    campaignId: campaign.id,
  });

  const handleStepSave = React.useCallback((step: WizardStepId) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const handleNavigateToStep = (step: WizardStepId) => {
    setCurrentStep(step);
  };

  // Step 3: Save idea coach data
  const handleIdeaCoachSave = (data: StepIdeaCoachData, coachUsers: PickedUser[]) => {
    // Update campaign settings
    updateMutation.mutate(
      {
        id: campaign.id,
        hasIdeaCoach: data.hasIdeaCoach,
        coachAssignmentMode: data.coachAssignmentMode,
        ideaCategories: data.categories,
        settings: {
          ...(campaign.settings as Record<string, unknown> | null),
          globalCoachId: data.globalCoachId,
        },
      },
      {
        onSuccess: () => {
          handleStepSave(3);
        },
      },
    );

    // Set coach members
    if (data.hasIdeaCoach && coachUsers.length > 0) {
      setMembersMutation.mutate({
        campaignId: campaign.id,
        members: coachUsers.map((u) => ({
          userId: u.id,
          role: "CAMPAIGN_COACH" as const,
        })),
      });
    }
  };

  // Step 4: Save community data
  const handleCommunitySave = (
    data: StepCommunityData,
    membersByRole: Record<string, PickedUser[]>,
  ) => {
    updateMutation.mutate(
      {
        id: campaign.id,
        audienceType: data.audienceType,
      },
      {
        onSuccess: () => {
          handleStepSave(4);
        },
      },
    );

    // Set all role members
    const allMembers: {
      userId: string;
      role: "CAMPAIGN_MODERATOR" | "CAMPAIGN_EVALUATOR" | "CAMPAIGN_SEEDER";
    }[] = [];
    for (const [role, users] of Object.entries(membersByRole)) {
      for (const user of users) {
        allMembers.push({
          userId: user.id,
          role: role as "CAMPAIGN_MODERATOR" | "CAMPAIGN_EVALUATOR" | "CAMPAIGN_SEEDER",
        });
      }
    }

    if (allMembers.length > 0) {
      setMembersMutation.mutate({
        campaignId: campaign.id,
        members: allMembers,
      });
    }
  };

  // Step 5: Save settings data
  const handleSettingsSave = (data: StepSettingsData) => {
    updateMutation.mutate(
      {
        id: campaign.id,
        hasQualificationPhase: data.hasQualificationPhase,
        hasVoting: data.hasVoting,
        votingCriteria: data.votingCriteria,
        graduationVisitors: data.graduationVisitors,
        graduationCommenters: data.graduationCommenters,
        graduationVoters: data.graduationVoters,
        graduationVotingLevel: data.graduationVotingLevel,
        graduationDaysInStatus: data.graduationDaysInStatus,
        isConfidentialAllowed: data.isConfidentialAllowed,
        isShowOnStartPage: data.isShowOnStartPage,
      },
      {
        onSuccess: () => {
          handleStepSave(5);
        },
      },
    );
  };

  // Derive coach users from campaign members
  const coachUsers: PickedUser[] = React.useMemo(() => {
    if (!campaignMembers) return [];
    return campaignMembers.filter((m) => m.role === "CAMPAIGN_COACH").map((m) => m.user);
  }, [campaignMembers]);

  const memberData = React.useMemo(() => {
    if (!campaignMembers) return [];
    return campaignMembers.map((m) => ({
      userId: m.userId,
      role: m.role,
      user: m.user,
    }));
  }, [campaignMembers]);

  const isSaving = updateMutation.isPending || setMembersMutation.isPending;

  return (
    <div className="flex min-h-[600px] gap-8">
      {/* Step Sidebar */}
      <nav className="w-64 shrink-0" aria-label="Wizard steps">
        <ol className="space-y-1">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? FileText;
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.has(step.id);

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => handleNavigateToStep(step.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : isCompleted
                        ? "text-green-700 hover:bg-green-50"
                        : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive
                        ? "bg-primary-600 text-white"
                        : isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400">Step {step.id}</span>
                    <span>{step.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="flex-1">
        {currentStep === 1 && (
          <StepDescription
            campaign={campaign}
            onSave={(data) => {
              updateMutation.mutate(
                {
                  id: campaign.id,
                  title: data.title,
                  teaser: data.teaser ?? undefined,
                  description: data.description ?? undefined,
                  bannerUrl: data.bannerUrl,
                  videoUrl: data.videoUrl,
                  submissionCloseDate: data.submissionCloseDate,
                  votingCloseDate: data.votingCloseDate,
                  plannedCloseDate: data.plannedCloseDate,
                  settings: {
                    ...(campaign.settings as Record<string, unknown> | null),
                    callToAction: data.callToAction,
                    supportContent: data.supportContent,
                    tags: data.tags,
                  },
                },
                {
                  onSuccess: () => {
                    handleStepSave(1);
                  },
                },
              );
            }}
            isSaving={updateMutation.isPending}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <StepSubmissionForm
            campaign={campaign}
            onSave={(data) => {
              updateMutation.mutate(
                {
                  id: campaign.id,
                  customFields: data.customFields,
                },
                {
                  onSuccess: () => {
                    handleStepSave(2);
                  },
                },
              );
            }}
            isSaving={updateMutation.isPending}
            onBack={() => setCurrentStep(1)}
            onDone={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <StepIdeaCoach
            campaign={campaign}
            coaches={coachUsers}
            onSave={handleIdeaCoachSave}
            isSaving={isSaving}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <StepCommunity
            campaign={campaign}
            members={memberData}
            onSave={handleCommunitySave}
            isSaving={isSaving}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && (
          <StepSettings
            campaign={campaign}
            onSave={handleSettingsSave}
            isSaving={isSaving}
            onBack={() => setCurrentStep(4)}
            onDone={() => router.push(`/campaigns/${campaign.id}`)}
          />
        )}
      </div>
    </div>
  );
}
