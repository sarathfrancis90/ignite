"use client";

import * as React from "react";
import { Search, Plus, Pencil, Archive, RotateCcw, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface SpaceItem {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  logoUrl: string | null;
  status: "ACTIVE" | "ARCHIVED";
  memberCount: number;
  adminCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SpaceListProps {
  spaces: SpaceItem[];
  nextCursor?: string;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  selectedSpaceId: string | null;
  onSelectSpace: (id: string | null) => void;
  onLoadMore: () => void;
  onCreateSpace: () => void;
  onEditSpace: (space: SpaceItem) => void;
  onArchiveSpace: (space: SpaceItem) => void;
  onActivateSpace: (space: SpaceItem) => void;
}

export function SpaceList({
  spaces,
  nextCursor,
  isLoading,
  search,
  onSearchChange,
  selectedSpaceId,
  onSelectSpace,
  onLoadMore,
  onCreateSpace,
  onEditSpace,
  onArchiveSpace,
  onActivateSpace,
}: SpaceListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Spaces</h2>
        <Button size="sm" onClick={onCreateSpace}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Space
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search spaces..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {isLoading && spaces.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <Globe className="mb-2 h-10 w-10" />
          <p className="text-sm font-medium">No spaces found</p>
          <p className="mt-1 text-xs">Create your first Innovation Space</p>
        </div>
      ) : (
        <div className="space-y-2">
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => onSelectSpace(space.id === selectedSpaceId ? null : space.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                space.id === selectedSpaceId
                  ? "border-primary-300 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{space.name}</span>
                    <Badge variant={space.status === "ACTIVE" ? "default" : "secondary"}>
                      {space.status === "ACTIVE" ? "Active" : "Archived"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">/spaces/{space.slug}</p>
                  {space.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">{space.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {space.memberCount} members
                    </span>
                    <span>{space.adminCount} admins</span>
                  </div>
                </div>
                <div className="ml-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSpace(space);
                    }}
                    title="Edit space"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {space.status === "ACTIVE" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-amber-600 hover:text-amber-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveSpace(space);
                      }}
                      title="Archive space"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivateSpace(space);
                      }}
                      title="Activate space"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </button>
          ))}

          {nextCursor && (
            <Button variant="outline" className="w-full" onClick={onLoadMore} disabled={isLoading}>
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
