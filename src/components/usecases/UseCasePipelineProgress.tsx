"use client";

import { Check } from "lucide-react";

type UseCaseStatusType =
  | "IDENTIFIED"
  | "QUALIFICATION"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED";

const PIPELINE_STEPS: { status: UseCaseStatusType; label: string }[] = [
  { status: "IDENTIFIED", label: "Identified" },
  { status: "QUALIFICATION", label: "Qualification" },
  { status: "EVALUATION", label: "Evaluation" },
  { status: "PILOT", label: "Pilot" },
  { status: "PARTNERSHIP", label: "Partnership" },
];

const STATUS_ORDER: Record<UseCaseStatusType, number> = {
  IDENTIFIED: 0,
  QUALIFICATION: 1,
  EVALUATION: 2,
  PILOT: 3,
  PARTNERSHIP: 4,
  ARCHIVED: -1,
};

interface UseCasePipelineProgressProps {
  currentStatus: UseCaseStatusType;
}

export function UseCasePipelineProgress({ currentStatus }: UseCasePipelineProgressProps) {
  const currentIndex = STATUS_ORDER[currentStatus];

  if (currentStatus === "ARCHIVED") {
    return (
      <div className="rounded-lg bg-gray-100 px-4 py-2 text-center text-sm text-gray-600">
        Archived
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.status} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  isComplete
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`text-center text-xs ${
                  isCurrent ? "font-semibold text-primary-700" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < PIPELINE_STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${
                  index < currentIndex ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
