import type { Idea, IdeaStatus } from "@/types/idea";

export type MetricComparison = "higher" | "lower" | "equal";

export function compareMetric(
  a: number | null,
  b: number | null,
): { left: MetricComparison; right: MetricComparison } {
  if (a === null && b === null) return { left: "equal", right: "equal" };
  if (a === null) return { left: "lower", right: "higher" };
  if (b === null) return { left: "higher", right: "lower" };
  if (a > b) return { left: "higher", right: "lower" };
  if (a < b) return { left: "lower", right: "higher" };
  return { left: "equal", right: "equal" };
}

export function getStatusColor(status: IdeaStatus): string {
  const colors: Record<IdeaStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    QUALIFICATION: "bg-yellow-100 text-yellow-700",
    COMMUNITY_DISCUSSION: "bg-blue-100 text-blue-700",
    HOT: "bg-red-100 text-red-700",
    EVALUATION: "bg-purple-100 text-purple-700",
    SELECTED_CONCEPT: "bg-indigo-100 text-indigo-700",
    IMPLEMENTATION: "bg-cyan-100 text-cyan-700",
    IMPLEMENTED: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-200 text-gray-500",
    REJECTED: "bg-red-200 text-red-600",
  };
  return colors[status];
}

export function formatStatus(status: IdeaStatus): string {
  return status.replace(/_/g, " ");
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getMetricHighlightClass(comparison: MetricComparison): string {
  if (comparison === "higher")
    return "bg-green-50 text-green-700 font-semibold";
  if (comparison === "lower") return "text-gray-500";
  return "";
}

export function canEnterComparison(selectedIdeas: Idea[]): boolean {
  return selectedIdeas.length === 2;
}
