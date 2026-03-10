"use client";

import { clsx } from "clsx";
import type { MetricComparison } from "@/lib/comparison-utils";
import { getMetricHighlightClass } from "@/lib/comparison-utils";

interface ComparisonMetricProps {
  label: string;
  leftValue: string | number | null;
  rightValue: string | number | null;
  leftComparison: MetricComparison;
  rightComparison: MetricComparison;
}

export function ComparisonMetric({
  label,
  leftValue,
  rightValue,
  leftComparison,
  rightComparison,
}: ComparisonMetricProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <div
        className={clsx(
          "rounded px-2 py-1 text-right text-sm",
          getMetricHighlightClass(leftComparison),
        )}
        data-testid={`metric-left-${label}`}
      >
        {leftValue ?? "—"}
      </div>
      <div className="text-xs font-medium text-gray-400 whitespace-nowrap">
        {label}
      </div>
      <div
        className={clsx(
          "rounded px-2 py-1 text-left text-sm",
          getMetricHighlightClass(rightComparison),
        )}
        data-testid={`metric-right-${label}`}
      >
        {rightValue ?? "—"}
      </div>
    </div>
  );
}
