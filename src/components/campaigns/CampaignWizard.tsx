"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ClipboardList, GitBranch, Users, Rocket, Check, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { WIZARD_STEPS } from "@/types/campaign-wizard";
import type { WizardStepId } from "@/types/campaign-wizard";
import { StepDescription } from "./wizard/StepDescription";
import { StepSubmissionForm } from "./wizard/StepSubmissionForm";

const STEP_ICONS = [FileText, ClipboardList, GitBranch, Users, Rocket] as const;

const MAX_ACTIVE_STEP = 2;

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

  const handleStepSave = React.useCallback((step: WizardStepId) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const handleNavigateToStep = (step: WizardStepId) => {
    if (step <= MAX_ACTIVE_STEP) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="flex min-h-[600px] gap-8">
      {/* Step Sidebar */}
      <nav className="w-64 shrink-0" aria-label="Wizard steps">
        <ol className="space-y-1">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? FileText;
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.has(step.id);
            const isLocked = step.id > MAX_ACTIVE_STEP;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => handleNavigateToStep(step.id)}
                  disabled={isLocked}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : isLocked
                        ? "cursor-not-allowed text-gray-300"
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
                          : isLocked
                            ? "bg-gray-100 text-gray-300"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : isLocked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
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
            onDone={() => router.push(`/campaigns/${campaign.id}`)}
          />
        )}

        {currentStep > MAX_ACTIVE_STEP && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Lock className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Coming Soon</h3>
              <p className="mt-2 text-sm text-gray-500">
                This step will be available in a future update.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
