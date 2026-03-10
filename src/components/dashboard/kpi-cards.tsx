import {
  Megaphone,
  Lightbulb,
  ClipboardCheck,
  FolderKanban,
  MessageCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { KpiMetric } from "@/types/dashboard";

const iconMap: Record<string, typeof Megaphone> = {
  megaphone: Megaphone,
  lightbulb: Lightbulb,
  "clipboard-check": ClipboardCheck,
  "folder-kanban": FolderKanban,
  "message-circle": MessageCircle,
};

interface KpiCardsProps {
  metrics: KpiMetric[];
}

export function KpiCards({ metrics }: KpiCardsProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
      data-testid="kpi-cards"
    >
      {metrics.map((metric) => {
        const Icon = iconMap[metric.icon];
        return (
          <div
            key={metric.label}
            className="rounded-lg border border-gray-100 bg-white p-4 shadow-xs"
            data-testid={`kpi-card-${metric.icon}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                {metric.label}
              </span>
              {Icon && (
                <Icon
                  size={20}
                  className="opacity-60"
                  style={{ color: metric.color }}
                />
              )}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {metric.value}
              </span>
              {metric.change !== undefined && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    metric.change >= 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {metric.change >= 0 ? (
                    <TrendingUp size={14} className="mr-0.5" />
                  ) : (
                    <TrendingDown size={14} className="mr-0.5" />
                  )}
                  {metric.change >= 0 ? "+" : ""}
                  {metric.change}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
