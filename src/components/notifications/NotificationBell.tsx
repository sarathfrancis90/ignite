"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: notificationsData, refetch } = trpc.notification.list.useQuery(
    { limit: 10 },
    { enabled: isOpen },
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

  useEffect(() => {
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

  const unreadCount = unreadData?.count ?? 0;
  const notifications = notificationsData?.items ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                  onClick={() => markAllAsReadMutation.mutate({})}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50",
                    !notification.isRead && "bg-primary-50/50",
                  )}
                >
                  <div className="mt-0.5">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{notification.body}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <button
                      className="mt-1 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                      disabled={markAsReadMutation.isPending}
                      aria-label="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              href="/notifications"
              className="flex items-center justify-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationIcon({ type }: { type: string }) {
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
        "flex h-8 w-8 items-center justify-center rounded-full",
        colorMap[type] ?? "bg-gray-100 text-gray-600",
      )}
    >
      <Bell className="h-4 w-4" />
    </div>
  );
}
