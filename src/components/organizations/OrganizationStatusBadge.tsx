"use client";

import { cn } from "@/lib/utils";

type RelationshipStatusValue =
  | "IDENTIFIED"
  | "VERIFIED"
  | "QUALIFIED"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED";

type NdaStatusValue = "NONE" | "REQUESTED" | "SIGNED" | "EXPIRED";

const RELATIONSHIP_STATUS_CONFIG: Record<
  RelationshipStatusValue,
  { label: string; className: string }
> = {
  IDENTIFIED: {
    label: "Identified",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  VERIFIED: {
    label: "Verified",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  QUALIFIED: {
    label: "Qualified",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  EVALUATION: {
    label: "Evaluation",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  PILOT: {
    label: "Pilot",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PARTNERSHIP: {
    label: "Partnership",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

const NDA_STATUS_CONFIG: Record<NdaStatusValue, { label: string; className: string }> = {
  NONE: {
    label: "No NDA",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
  REQUESTED: {
    label: "NDA Requested",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  SIGNED: {
    label: "NDA Signed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  EXPIRED: {
    label: "NDA Expired",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface RelationshipBadgeProps {
  status: RelationshipStatusValue;
  className?: string;
}

export function RelationshipBadge({ status, className }: RelationshipBadgeProps) {
  const config = RELATIONSHIP_STATUS_CONFIG[status];
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

interface NdaBadgeProps {
  status: NdaStatusValue;
  className?: string;
}

export function NdaBadge({ status, className }: NdaBadgeProps) {
  const config = NDA_STATUS_CONFIG[status];
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
