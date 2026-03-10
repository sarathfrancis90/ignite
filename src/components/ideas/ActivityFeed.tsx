"use client";

import { cn } from "@/lib/utils";
import { ActivityEventType, type ActivityLogEntry } from "@/types/activity";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useRef } from "react";

interface ActivityFeedProps {
  items: ActivityLogEntry[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  className?: string;
}

const eventConfig: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  [ActivityEventType.IDEA_SUBMITTED]: {
    label: "submitted this idea",
    icon: "M12 4v16m8-8H4",
    color: "text-blue-500 bg-blue-50",
  },
  [ActivityEventType.IDEA_STATUS_CHANGED]: {
    label: "changed status",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    color: "text-purple-500 bg-purple-50",
  },
  [ActivityEventType.IDEA_GRADUATED]: {
    label: "graduated to HOT!",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    color: "text-red-500 bg-red-50",
  },
  [ActivityEventType.IDEA_PUBLISHED]: {
    label: "published to community",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    color: "text-green-500 bg-green-50",
  },
  [ActivityEventType.COMMENT_CREATED]: {
    label: "added a comment",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "text-cyan-500 bg-cyan-50",
  },
  [ActivityEventType.VOTE_SUBMITTED]: {
    label: "submitted a vote",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    color: "text-yellow-500 bg-yellow-50",
  },
  [ActivityEventType.LIKE_ADDED]: {
    label: "liked this idea",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "text-pink-500 bg-pink-50",
  },
  [ActivityEventType.LIKE_REMOVED]: {
    label: "unliked this idea",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "text-gray-400 bg-gray-50",
  },
  [ActivityEventType.IDEA_ARCHIVED]: {
    label: "archived this idea",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
    color: "text-gray-500 bg-gray-50",
  },
  [ActivityEventType.COAUTHOR_ADDED]: {
    label: "was added as co-author",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    color: "text-indigo-500 bg-indigo-50",
  },
};

function getEventConfig(eventType: string) {
  return (
    eventConfig[eventType] ?? {
      label: eventType.toLowerCase().replace(/_/g, " "),
      icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "text-gray-500 bg-gray-50",
    }
  );
}

function getStatusChangeLabel(metadata: Record<string, unknown>): string {
  const prev = metadata.previousStatus as string | undefined;
  const next = metadata.newStatus as string | undefined;
  if (prev && next) {
    return `changed status from ${prev.replace(/_/g, " ")} to ${next.replace(/_/g, " ")}`;
  }
  return "changed status";
}

function ActivityItem({ entry }: { entry: ActivityLogEntry }) {
  const config = getEventConfig(entry.eventType);
  const actorName =
    entry.actor.displayName ??
    `${entry.actor.firstName} ${entry.actor.lastName}`;

  const label =
    entry.eventType === ActivityEventType.IDEA_STATUS_CHANGED
      ? getStatusChangeLabel(entry.metadata)
      : config.label;

  return (
    <div className="flex gap-3 py-3">
      <div className="flex-shrink-0">
        {entry.actor.avatarUrl ? (
          <img
            src={entry.actor.avatarUrl}
            alt={actorName}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              config.color,
            )}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={config.icon}
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-gray-600">{label}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({
  items,
  hasMore,
  onLoadMore,
  isLoading,
  className,
}: ActivityFeedProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          onLoadMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMore, onLoadMore],
  );

  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn("text-center py-8 text-sm text-gray-500", className)}>
        No activity yet
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-gray-100", className)}>
      {items.map((entry, index) => (
        <div
          key={entry.id}
          ref={index === items.length - 1 ? lastItemRef : undefined}
        >
          <ActivityItem entry={entry} />
        </div>
      ))}
      {isLoading && (
        <div className="py-4 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      )}
    </div>
  );
}
