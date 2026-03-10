"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type CampaignStatusValue =
  | "DRAFT"
  | "SEEDING"
  | "SUBMISSION"
  | "DISCUSSION_VOTING"
  | "EVALUATION"
  | "CLOSED";

const PHASE_ORDER: CampaignStatusValue[] = [
  "DRAFT",
  "SEEDING",
  "SUBMISSION",
  "DISCUSSION_VOTING",
  "EVALUATION",
  "CLOSED",
];

const PHASE_LABELS: Record<CampaignStatusValue, string> = {
  DRAFT: "Draft",
  SEEDING: "Seeding",
  SUBMISSION: "Submission",
  DISCUSSION_VOTING: "Discussion & Voting",
  EVALUATION: "Evaluation",
  CLOSED: "Closed",
};

interface CampaignLifecycleBarProps {
  currentStatus: CampaignStatusValue;
  hasSeedingPhase: boolean;
  hasDiscussionPhase: boolean;
  className?: string;
}

export function CampaignLifecycleBar({
  currentStatus,
  hasSeedingPhase,
  hasDiscussionPhase,
  className,
}: CampaignLifecycleBarProps) {
  const phases = PHASE_ORDER.filter((phase) => {
    if (phase === "SEEDING" && !hasSeedingPhase) return false;
    if (phase === "DISCUSSION_VOTING" && !hasDiscussionPhase) return false;
    return true;
  });

  const currentIndex = phases.indexOf(currentStatus);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {phases.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={phase} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    isCurrent && "border-primary-600 bg-primary-600 text-white",
                    isFuture && "border-gray-300 bg-white text-gray-400",
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={cn(
                    "mt-1.5 whitespace-nowrap text-center text-xs font-medium",
                    isCompleted && "text-green-600",
                    isCurrent && "text-primary-600",
                    isFuture && "text-gray-400",
                  )}
                >
                  {PHASE_LABELS[phase]}
                </span>
              </div>
              {index < phases.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1",
                    index < currentIndex ? "bg-green-500" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
