"use client";

import * as React from "react";
import {
  Check,
  Trash2,
  Lightbulb,
  MessageSquare,
  Megaphone,
  Shield,
  Flame,
  ClipboardCheck,
  AtSign,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeIconMap: Record<string, React.ElementType> = {
  IDEA_SUBMITTED: Lightbulb,
  IDEA_STATUS_CHANGED: Lightbulb,
  IDEA_HOT_GRADUATION: Flame,
  EVALUATION_REQUESTED: ClipboardCheck,
  CAMPAIGN_PHASE_CHANGED: Megaphone,
  COMMENT_ON_FOLLOWED: MessageSquare,
  COMMENT_MENTION: AtSign,
  ROLE_ASSIGNED: Shield,
  ROLE_REMOVED: Shield,
  SYSTEM: Info,
};

const typeColorMap: Record<string, string> = {
  IDEA_SUBMITTED: "text-blue-500",
  IDEA_STATUS_CHANGED: "text-blue-500",
  IDEA_HOT_GRADUATION: "text-orange-500",
  EVALUATION_REQUESTED: "text-purple-500",
  CAMPAIGN_PHASE_CHANGED: "text-green-500",
  COMMENT_ON_FOLLOWED: "text-gray-500",
  COMMENT_MENTION: "text-indigo-500",
  ROLE_ASSIGNED: "text-emerald-500",
  ROLE_REMOVED: "text-red-500",
  SYSTEM: "text-gray-400",
};

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const Icon = typeIconMap[notification.type] ?? Info;
  const iconColor = typeColorMap[notification.type] ?? "text-gray-400";

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <div
      className={cn(
        "group flex items-start gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50",
        !notification.isRead && "bg-blue-50/50",
      )}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.isRead ? "text-gray-600" : "font-medium text-gray-900",
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{notification.body}</p>
        <p className="mt-1 text-[11px] text-gray-400">{timeAgo}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-blue-500"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
