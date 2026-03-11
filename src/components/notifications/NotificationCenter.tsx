"use client";

import * as React from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { NotificationItem } from "./NotificationItem";
import { NotificationFilters } from "./NotificationFilters";

type NotificationTypeFilter =
  | "IDEA_SUBMITTED"
  | "IDEA_STATUS_CHANGED"
  | "IDEA_HOT_GRADUATION"
  | "EVALUATION_REQUESTED"
  | "CAMPAIGN_PHASE_CHANGED"
  | "COMMENT_ON_FOLLOWED"
  | "COMMENT_MENTION"
  | "ROLE_ASSIGNED"
  | "ROLE_REMOVED"
  | "SYSTEM";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<NotificationTypeFilter | undefined>();
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: unreadData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.notification.list.useInfiniteQuery(
      { limit: 20, type: typeFilter, unreadOnly },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: isOpen,
      },
    );

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const deleteNotification = trpc.notification.delete.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const unreadCount = unreadData?.count ?? 0;
  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-lg"
          role="dialog"
          aria-label="Notification center"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-gray-500"
                  onClick={() => markAllAsRead.mutate({ type: typeFilter })}
                  disabled={markAllAsRead.isPending}
                  title="Mark all as read"
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <NotificationFilters
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            unreadOnly={unreadOnly}
            onUnreadOnlyChange={setUnreadOnly}
          />

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            )}

            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={(id) => markAsRead.mutate({ id })}
                onDelete={(id) => deleteNotification.mutate({ id })}
              />
            ))}

            {/* Load More */}
            {hasNextPage && (
              <div className="border-t border-gray-100 px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-500"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
