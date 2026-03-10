"use client";

import { clsx } from "clsx";
import type { IdeaStatus } from "@/types/idea";
import { getStatusColor, formatStatus } from "@/lib/comparison-utils";

interface StatusBadgeProps {
  status: IdeaStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        getStatusColor(status),
      )}
      data-testid="status-badge"
    >
      {formatStatus(status)}
    </span>
  );
}
