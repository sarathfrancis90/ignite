"use client";

interface ComparisonToolbarProps {
  onSwap: () => void;
  onExit: () => void;
  leftTitle: string | null;
  rightTitle: string | null;
}

export function ComparisonToolbar({
  onSwap,
  onExit,
  leftTitle,
  rightTitle,
}: ComparisonToolbarProps) {
  return (
    <div
      className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 lg:sticky lg:top-0 lg:z-10"
      data-testid="comparison-toolbar"
    >
      {/* Sticky header for mobile — shows both titles */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-gray-700">
          {leftTitle ?? "Select idea"}
        </span>
        <span className="text-gray-400">vs</span>
        <span className="truncate text-sm font-medium text-gray-700">
          {rightTitle ?? "Select idea"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSwap}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Swap ideas"
          data-testid="swap-ideas-btn"
        >
          <SwapIcon />
          Swap
        </button>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
          aria-label="Exit comparison"
          data-testid="exit-comparison-btn"
        >
          Exit Comparison
        </button>
      </div>
    </div>
  );
}

function SwapIcon() {
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
        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
      />
    </svg>
  );
}
