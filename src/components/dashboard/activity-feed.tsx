import {
  Lightbulb,
  MessageCircle,
  Flame,
  ClipboardCheck,
  Handshake,
} from "lucide-react";
import type { ActivityItem, ActivityType } from "@/types/dashboard";

const activityConfig: Record<
  ActivityType,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bg: string;
    verb: string;
  }
> = {
  idea_submitted: {
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-50",
    verb: "submitted a new idea",
  },
  comment_added: {
    icon: MessageCircle,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    verb: "commented on",
  },
  idea_hot: {
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-50",
    verb: "'s idea reached HOT! status",
  },
  evaluation_completed: {
    icon: ClipboardCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    verb: "completed evaluation in",
  },
  use_case_created: {
    icon: Handshake,
    color: "text-violet-500",
    bg: "bg-violet-50",
    verb: "created a use case",
  },
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div
      className="rounded-lg border border-gray-100 bg-white shadow-xs"
      data-testid="activity-feed"
    >
      <div className="px-4 pt-4">
        <h2 className="text-base font-semibold text-gray-900">
          Recent Activity
        </h2>
      </div>
      <div className="mt-3 divide-y divide-gray-50 px-4">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 py-3"
              data-testid="activity-item"
            >
              <div className={`rounded-md p-2 ${config.bg} ${config.color}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">
                    {activity.actor}
                  </span>{" "}
                  {config.verb}{" "}
                  <span className="font-medium text-gray-900">
                    {activity.target}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
