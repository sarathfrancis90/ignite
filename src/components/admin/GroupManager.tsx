"use client";

import * as React from "react";
import { Search, Plus, Pencil, Trash2, Users, UserPlus, UserMinus, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ── Types ──────────────────────────────────────────────────

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: Date | string;
}

interface GroupMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isActive: boolean;
  joinedAt: Date | string;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  members: GroupMember[];
}

interface GroupListProps {
  groups: GroupItem[];
  nextCursor?: string;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  onLoadMore: () => void;
  onCreateGroup: () => void;
  onEditGroup: (group: GroupItem) => void;
  onDeleteGroup: (group: GroupItem) => void;
}

interface GroupDetailPanelProps {
  group: GroupDetail;
  isLoading: boolean;
  onAddMember: () => void;
  onRemoveMember: (userId: string) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function GroupList({
  groups,
  nextCursor,
  isLoading,
  search,
  onSearchChange,
  selectedGroupId,
  onSelectGroup,
  onLoadMore,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
}: GroupListProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreateGroup}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Group list */}
      <div className="space-y-1">
        {groups.map((group) => (
          <div
            key={group.id}
            className={cn(
              "group flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors",
              selectedGroupId === group.id
                ? "border-primary-200 bg-primary-50"
                : "border-transparent hover:bg-gray-50",
            )}
            onClick={() => onSelectGroup(group.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelectGroup(group.id);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate text-sm font-medium text-gray-900">{group.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                </Badge>
              </div>
              {group.description && (
                <p className="mt-0.5 truncate pl-6 text-xs text-gray-500">{group.description}</p>
              )}
            </div>
            <div className="hidden items-center gap-1 group-hover:flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditGroup(group);
                }}
                title="Edit group"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group);
                }}
                title="Delete group"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {groups.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FolderTree className="mb-3 h-12 w-12" />
            <p className="text-sm font-medium">No groups yet</p>
            <p className="mt-1 text-xs">Create a group to organize users</p>
          </div>
        )}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function GroupDetailPanel({
  group,
  isLoading,
  onAddMember,
  onRemoveMember,
}: GroupDetailPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
          {group.description && <p className="mt-0.5 text-sm text-gray-500">{group.description}</p>}
        </div>
        <Button size="sm" onClick={onAddMember}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Members ({group.memberCount})
      </div>

      <div className="space-y-1">
        {group.members.map((member) => (
          <div
            key={member.id}
            className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {member.image ? (
                  <AvatarImage src={member.image} alt={member.name ?? member.email} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name, member.email)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {member.name ?? "Unnamed"}
                </p>
                <p className="truncate text-xs text-gray-500">{member.email}</p>
              </div>
              {!member.isActive && (
                <Badge variant="destructive" className="text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700 group-hover:flex"
              onClick={() => onRemoveMember(member.id)}
              title="Remove member"
            >
              <UserMinus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {group.members.length === 0 && (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No members yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
