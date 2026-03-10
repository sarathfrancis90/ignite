"use client";

import * as React from "react";
import Link from "next/link";
import { Radio, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChannelCard } from "@/components/channels/ChannelCard";
import type { ChannelCardProps } from "@/components/channels/ChannelCard";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { Action } from "@/lib/permissions";

type ChannelStatusFilter = "ACTIVE" | "ARCHIVED" | undefined;

const STATUS_FILTERS: { label: string; value: ChannelStatusFilter }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
];

export default function ChannelsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ChannelStatusFilter>(undefined);
  const debouncedSearch = useDebounce(search, 300);
  const canCreateChannel = usePermission(Action.CHANNEL_CREATE);

  const channelsQuery = trpc.channel.list.useQuery({
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Channels</h1>
          <p className="mt-1 text-sm text-gray-500">
            Always-open spaces for continuous idea collection and discussion.
          </p>
        </div>
        {canCreateChannel && (
          <Link href="/channels/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Channel
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {channelsQuery.isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {channelsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load channels. Please try again.</p>
        </div>
      )}

      {channelsQuery.data && channelsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Radio className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No channels found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search || statusFilter
              ? "Try adjusting your filters."
              : "Get started by creating your first channel."}
          </p>
          {!search && !statusFilter && canCreateChannel && (
            <Link href="/channels/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Channel
              </Button>
            </Link>
          )}
        </div>
      )}

      {channelsQuery.data && channelsQuery.data.items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {channelsQuery.data.items.map((channel: ChannelCardProps["channel"]) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
