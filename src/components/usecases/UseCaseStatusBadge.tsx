"use client";

import { Badge } from "@/components/ui/badge";

type UseCaseStatusType =
  | "IDENTIFIED"
  | "QUALIFICATION"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED";

type UseCasePriorityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const STATUS_CONFIG: Record<UseCaseStatusType, { label: string; className: string }> = {
  IDENTIFIED: { label: "Identified", className: "bg-blue-100 text-blue-800" },
  QUALIFICATION: { label: "Qualification", className: "bg-yellow-100 text-yellow-800" },
  EVALUATION: { label: "Evaluation", className: "bg-purple-100 text-purple-800" },
  PILOT: { label: "Pilot", className: "bg-orange-100 text-orange-800" },
  PARTNERSHIP: { label: "Partnership", className: "bg-green-100 text-green-800" },
  ARCHIVED: { label: "Archived", className: "bg-gray-100 text-gray-600" },
};

const PRIORITY_CONFIG: Record<UseCasePriorityType, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Medium", className: "bg-blue-100 text-blue-700" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-700" },
  CRITICAL: { label: "Critical", className: "bg-red-100 text-red-700" },
};

interface UseCaseStatusBadgeProps {
  status: UseCaseStatusType;
}

export function UseCaseStatusBadge({ status }: UseCaseStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

interface UseCasePriorityBadgeProps {
  priority: UseCasePriorityType;
}

export function UseCasePriorityBadge({ priority }: UseCasePriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
