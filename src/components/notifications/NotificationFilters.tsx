"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const FILTER_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Ideas", value: "IDEA_SUBMITTED" },
  { label: "Status", value: "IDEA_STATUS_CHANGED" },
  { label: "Comments", value: "COMMENT_ON_FOLLOWED" },
  { label: "Mentions", value: "COMMENT_MENTION" },
  { label: "Campaigns", value: "CAMPAIGN_PHASE_CHANGED" },
] as const;

type NotificationType =
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

interface NotificationFiltersProps {
  typeFilter: NotificationType | undefined;
  onTypeFilterChange: (type: NotificationType | undefined) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
}

export function NotificationFilters({
  typeFilter,
  onTypeFilterChange,
  unreadOnly,
  onUnreadOnlyChange,
}: NotificationFiltersProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-100 px-4 py-2">
      {FILTER_OPTIONS.map((option) => (
        <Button
          key={option.label}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 flex-shrink-0 rounded-full px-2.5 text-[11px]",
            typeFilter === option.value
              ? "bg-primary-100 text-primary-700"
              : "text-gray-500 hover:text-gray-700",
          )}
          onClick={() => onTypeFilterChange(option.value)}
        >
          {option.label}
        </Button>
      ))}

      <div className="mx-1 h-4 w-px bg-gray-200" />

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 flex-shrink-0 rounded-full px-2.5 text-[11px]",
          unreadOnly ? "bg-primary-100 text-primary-700" : "text-gray-500 hover:text-gray-700",
        )}
        onClick={() => onUnreadOnlyChange(!unreadOnly)}
      >
        Unread
      </Button>
    </div>
  );
}
