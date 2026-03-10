"use client";

import { useCallback } from "react";
import { useComparisonStore } from "@/stores/comparison-store";
import { ComparisonPanel } from "./ComparisonPanel";
import { ComparisonToolbar } from "./ComparisonToolbar";
import { ComparisonMetrics } from "./ComparisonMetrics";

interface ComparisonModeProps {
  onChangeIdea: (position: "left" | "right") => void;
}

export function ComparisonMode({ onChangeIdea }: ComparisonModeProps) {
  const { leftIdea, rightIdea, swapIdeas, exitComparison, closePanel } =
    useComparisonStore();

  const handleCloseLeft = useCallback(() => closePanel("left"), [closePanel]);
  const handleCloseRight = useCallback(() => closePanel("right"), [closePanel]);
  const handleChangeLeft = useCallback(
    () => onChangeIdea("left"),
    [onChangeIdea],
  );
  const handleChangeRight = useCallback(
    () => onChangeIdea("right"),
    [onChangeIdea],
  );

  if (!leftIdea && !rightIdea) {
    return null;
  }

  return (
    <div className="flex h-full flex-col" data-testid="comparison-mode">
      <ComparisonToolbar
        onSwap={swapIdeas}
        onExit={exitComparison}
        leftTitle={leftIdea?.title ?? null}
        rightTitle={rightIdea?.title ?? null}
      />

      {/* Shared Metrics Bar — only when both ideas present */}
      {leftIdea && rightIdea && (
        <ComparisonMetrics leftIdea={leftIdea} rightIdea={rightIdea} />
      )}

      {/* Dual panels: side-by-side on lg+, stacked on smaller screens */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {leftIdea && (
          <div className="flex-1 overflow-hidden border-b border-gray-200 lg:border-r lg:border-b-0">
            <ComparisonPanel
              idea={leftIdea}
              position="left"
              onClose={handleCloseLeft}
              onChangeIdea={handleChangeLeft}
            />
          </div>
        )}
        {rightIdea && (
          <div className="flex-1 overflow-hidden">
            <ComparisonPanel
              idea={rightIdea}
              position="right"
              onClose={handleCloseRight}
              onChangeIdea={handleChangeRight}
            />
          </div>
        )}
      </div>
    </div>
  );
}
