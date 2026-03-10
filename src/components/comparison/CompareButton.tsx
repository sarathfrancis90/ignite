"use client";

import { clsx } from "clsx";
import type { Idea } from "@/types/idea";
import { useComparisonStore } from "@/stores/comparison-store";
import { canEnterComparison } from "@/lib/comparison-utils";

interface CompareButtonProps {
  selectedIdeas: Idea[];
  className?: string;
}

export function CompareButton({
  selectedIdeas,
  className,
}: CompareButtonProps) {
  const { enterComparison, isActive } = useComparisonStore();
  const canCompare = canEnterComparison(selectedIdeas);

  if (isActive) {
    return null;
  }

  return (
    <button
      onClick={() => {
        if (canCompare) {
          enterComparison(selectedIdeas[0], selectedIdeas[1]);
        }
      }}
      disabled={!canCompare}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        canCompare
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "cursor-not-allowed bg-gray-100 text-gray-400",
        className,
      )}
      aria-label="Compare selected ideas"
      data-testid="compare-btn"
    >
      <CompareIcon />
      Compare
      {selectedIdeas.length > 0 && (
        <span className="ml-1 text-xs opacity-75">
          ({selectedIdeas.length}/2)
        </span>
      )}
    </button>
  );
}

function CompareIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
      />
    </svg>
  );
}
