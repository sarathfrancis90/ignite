"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { NOTIFICATION_TYPES } from "@/server/services/notification.schemas";

type NotificationTypeFilter = (typeof NOTIFICATION_TYPES)[number] | undefined;

const TYPE_LABELS: Record<string, string> = {
  IDEA_SUBMITTED: "Idea Submitted",
  IDEA_STATUS_CHANGED: "Status Changed",
  IDEA_HOT_GRADUATION: "HOT Graduation",
  EVALUATION_REQUESTED: "Evaluation Requested",
  CAMPAIGN_PHASE_CHANGED: "Campaign Phase",
  COMMENT_ON_FOLLOWED: "Comments",
  ROLE_ASSIGNED: "Role Assigned",
  SYSTEM: "System",
};

export default function NotificationsPage() {
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>(undefined);
  const [readFilter, setReadFilter] = useState<boolean | undefined>(undefined);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    trpc.notification.list.useInfiniteQuery(
      { limit: 20, type: typeFilter, isRead: readFilter },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    );

  const utils = trpc.useUtils();

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void refetch();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void refetch();
    },
  });

  const { data: unreadData } = trpc.notification.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate({})}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />

        <button
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            readFilter === undefined
              ? "bg-primary-100 text-primary-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
          onClick={() => setReadFilter(undefined)}
        >
          All
        </button>
        <button
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            readFilter === false
              ? "bg-primary-100 text-primary-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
          onClick={() => setReadFilter(false)}
        >
          Unread
        </button>
        <button
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            readFilter === true
              ? "bg-primary-100 text-primary-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
          onClick={() => setReadFilter(true)}
        >
          Read
        </button>

        <span className="mx-1 text-gray-300">|</span>

        <button
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            typeFilter === undefined
              ? "bg-primary-100 text-primary-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
          onClick={() => setTypeFilter(undefined)}
        >
          All types
        </button>
        {NOTIFICATION_TYPES.map((type) => (
          <button
            key={type}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              typeFilter === type
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
            onClick={() => setTypeFilter(type)}
          >
            {TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {notifications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No notifications to show</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "flex items-start gap-4 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-gray-50",
                !notification.isRead && "bg-primary-50/30",
              )}
            >
              <NotificationTypeIcon type={notification.type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm",
                      notification.isRead ? "text-gray-700" : "font-medium text-gray-900",
                    )}
                  >
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{notification.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {TYPE_LABELS[notification.type] ?? notification.type}
                  </span>
                  {!notification.isRead && (
                    <button
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                      disabled={markAsReadMutation.isPending}
                    >
                      <Check className="h-3 w-3" />
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {hasNextPage && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationTypeIcon({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    IDEA_SUBMITTED: "bg-blue-100 text-blue-600",
    IDEA_STATUS_CHANGED: "bg-amber-100 text-amber-600",
    IDEA_HOT_GRADUATION: "bg-red-100 text-red-600",
    EVALUATION_REQUESTED: "bg-purple-100 text-purple-600",
    CAMPAIGN_PHASE_CHANGED: "bg-green-100 text-green-600",
    COMMENT_ON_FOLLOWED: "bg-cyan-100 text-cyan-600",
    ROLE_ASSIGNED: "bg-indigo-100 text-indigo-600",
    SYSTEM: "bg-gray-100 text-gray-600",
  };

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        colorMap[type] ?? "bg-gray-100 text-gray-600",
      )}
    >
      <Bell className="h-5 w-5" />
    </div>
  );
}
