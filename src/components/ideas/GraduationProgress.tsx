"use client";

import { cn } from "@/lib/utils";
import type { GraduationProgress as GraduationProgressType } from "@/types/idea";

interface GraduationProgressProps {
  progress: GraduationProgressType;
  className?: string;
}

const thresholdLabels: Record<string, string> = {
  visitors: "Visitors",
  commenters: "Commenters",
  voters: "Voters",
  votingLevel: "Avg. Vote Level",
  likes: "Likes",
  daysInStatus: "Days Active",
};

function ProgressBar({
  current,
  target,
  met,
}: {
  current: number;
  target: number;
  met: boolean;
}) {
  if (target === 0) return null;

  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={cn(
          "h-2 rounded-full transition-all duration-500",
          met ? "bg-green-500" : "bg-amber-500",
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function GraduationProgress({
  progress,
  className,
}: GraduationProgressProps) {
  const activeThresholds = Object.entries(progress.progress).filter(
    ([, value]) => value.target > 0,
  );

  if (activeThresholds.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border bg-white p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Graduation Progress
        </h3>
        {progress.isMet && (
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-red-500 px-2.5 py-0.5 text-xs font-bold text-white animate-pulse">
            HOT!
          </span>
        )}
      </div>

      <div className="space-y-3">
        {activeThresholds.map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">
                {thresholdLabels[key] ?? key}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-900">
                  {typeof value.current === "number" && value.current % 1 !== 0
                    ? value.current.toFixed(1)
                    : value.current}{" "}
                  / {value.target}
                </span>
                {value.met ? (
                  <svg
                    className="h-3.5 w-3.5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-3.5 w-3.5 text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <circle cx="10" cy="10" r="8" />
                  </svg>
                )}
              </div>
            </div>
            <ProgressBar
              current={value.current}
              target={value.target}
              met={value.met}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
