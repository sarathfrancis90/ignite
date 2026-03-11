"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const PHASE_COLORS: Record<string, string> = {
  IDENTIFIED: "bg-blue-500",
  QUALIFICATION: "bg-yellow-500",
  EVALUATION: "bg-purple-500",
  PILOT: "bg-orange-500",
  PARTNERSHIP: "bg-green-500",
};

const PHASE_LABELS: Record<string, string> = {
  IDENTIFIED: "Identified",
  QUALIFICATION: "Qualification",
  EVALUATION: "Evaluation",
  PILOT: "Pilot",
  PARTNERSHIP: "Partnership",
};

interface UseCasePipelineFunnelProps {
  organizationId?: string;
}

export function UseCasePipelineFunnel({ organizationId }: UseCasePipelineFunnelProps) {
  const funnelQuery = trpc.useCase.pipelineFunnel.useQuery({
    organizationId,
  });

  if (funnelQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (funnelQuery.isError || !funnelQuery.data) {
    return null;
  }

  const { funnel, total } = funnelQuery.data;
  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
          <span className="text-sm text-gray-500">{total} total use cases</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnel.map((phase) => {
            const widthPercent = total > 0 ? Math.max((phase.count / maxCount) * 100, 8) : 8;
            const color = PHASE_COLORS[phase.status] ?? "bg-gray-400";
            const label = PHASE_LABELS[phase.status] ?? phase.status;

            return (
              <div key={phase.status} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm font-medium text-gray-700">{label}</span>
                <div className="flex-1">
                  <div
                    className={`${color} flex h-8 items-center rounded px-3 transition-all`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{phase.count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
