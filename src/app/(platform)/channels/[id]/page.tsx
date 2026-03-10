"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, Radio, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { trpc } from "@/lib/trpc";

export default function ChannelDetailPage() {
  const params = useParams<{ id: string }>();

  const channelQuery = trpc.channel.getById.useQuery({ id: params.id });

  if (channelQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-50" />
      </div>
    );
  }

  if (channelQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">
          {channelQuery.error.message || "Failed to load channel."}
        </p>
        <Link href="/channels" className="mt-2 inline-block text-sm text-primary-600 underline">
          Back to Channels
        </Link>
      </div>
    );
  }

  const channel = channelQuery.data;
  if (!channel) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/channels"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Channels
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {channel.bannerUrl ? (
          <div className="relative h-48 w-full bg-gray-100">
            <Image src={channel.bannerUrl} alt={channel.title} fill className="object-cover" />
          </div>
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-accent-50 to-accent-100" />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-gray-900">{channel.title}</h1>
                <StatusBadge status={channel.status} />
              </div>
              {channel.teaser && <p className="mt-2 text-gray-600">{channel.teaser}</p>}
            </div>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Radio className="h-4 w-4" />
              Always Open
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {channel.memberCount} members
            </span>
            <span>
              Created by {channel.createdBy.name ?? channel.createdBy.email} on{" "}
              {format(new Date(channel.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs placeholder */}
      <div className="flex gap-1 border-b border-gray-200">
        {["Overview", "Ideas", "Discussion", "Members"].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === 0
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {channel.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About this Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{channel.description}</p>
              </CardContent>
            </Card>
          )}

          {channel.problemStatement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Problem Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-600">
                  {channel.problemStatement}
                </p>
              </CardContent>
            </Card>
          )}

          {!channel.description && !channel.problemStatement && (
            <Card>
              <CardContent className="py-12 text-center">
                <Radio className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No content yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Ideas and discussions will appear here once submitted.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={channel.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Discussion</span>
                <span>{channel.hasDiscussionPhase ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Voting</span>
                <span>{channel.hasVoting ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Likes</span>
                <span>{channel.hasLikes ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Qualification</span>
                <span>{channel.hasQualificationPhase ? "Enabled" : "Disabled"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
