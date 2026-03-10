"use client";

import type { Idea } from "@/types/idea";
import { compareMetric } from "@/lib/comparison-utils";
import { ComparisonMetric } from "./ComparisonMetric";

interface ComparisonMetricsProps {
  leftIdea: Idea;
  rightIdea: Idea;
}

export function ComparisonMetrics({
  leftIdea,
  rightIdea,
}: ComparisonMetricsProps) {
  const voteAvg = compareMetric(leftIdea.voteAverage, rightIdea.voteAverage);
  const voteCount = compareMetric(leftIdea.voteCount, rightIdea.voteCount);
  const comments = compareMetric(leftIdea.commentCount, rightIdea.commentCount);
  const likes = compareMetric(leftIdea.likeCount, rightIdea.likeCount);

  return (
    <div
      className="border-b border-gray-200 bg-gray-50 px-4 py-2"
      data-testid="comparison-metrics"
    >
      <ComparisonMetric
        label="Vote Avg"
        leftValue={leftIdea.voteAverage?.toFixed(1) ?? null}
        rightValue={rightIdea.voteAverage?.toFixed(1) ?? null}
        leftComparison={voteAvg.left}
        rightComparison={voteAvg.right}
      />
      <ComparisonMetric
        label="Votes"
        leftValue={leftIdea.voteCount}
        rightValue={rightIdea.voteCount}
        leftComparison={voteCount.left}
        rightComparison={voteCount.right}
      />
      <ComparisonMetric
        label="Comments"
        leftValue={leftIdea.commentCount}
        rightValue={rightIdea.commentCount}
        leftComparison={comments.left}
        rightComparison={comments.right}
      />
      <ComparisonMetric
        label="Likes"
        leftValue={leftIdea.likeCount}
        rightValue={rightIdea.likeCount}
        leftComparison={likes.left}
        rightComparison={likes.right}
      />
    </div>
  );
}
