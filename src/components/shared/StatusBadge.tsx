"use client";

import { cn } from "@/lib/utils";

type StatusValue =
  | "DRAFT"
  | "SEEDING"
  | "SUBMISSION"
  | "DISCUSSION_VOTING"
  | "EVALUATION"
  | "CLOSED"
  | "ACTIVE"
  | "ARCHIVED";

const STATUS_CONFIG: Record<StatusValue, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  SEEDING: {
    label: "Seeding",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  SUBMISSION: {
    label: "Submission",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DISCUSSION_VOTING: {
    label: "Discussion & Voting",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  EVALUATION: {
    label: "Evaluation",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
