"use client";

import { Users, Lightbulb, MessageSquare, Vote, Award, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { trpc } from "@/lib/trpc";

interface SponsorViewProps {
  campaignId: string;
}

export function SponsorView({ campaignId }: SponsorViewProps) {
  const sponsorQuery = trpc.campaign.getSponsorView.useQuery(
    { campaignId },
    { enabled: !!campaignId },
  );

  if (sponsorQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (sponsorQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">
          Failed to load sponsor view. You may not have sponsor access to this campaign.
        </p>
      </div>
    );
  }

  if (!sponsorQuery.data) return null;

  const data = sponsorQuery.data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-gray-900">{data.title}</h1>
              <StatusBadge status={data.status} />
            </div>
            {data.teaser && <p className="max-w-2xl text-gray-500">{data.teaser}</p>}
          </div>
          <div className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
            Sponsor View
          </div>
        </div>

        {data.description && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="prose prose-sm max-w-none text-gray-600">{data.description}</div>
          </div>
        )}

        {data.sponsors.length > 0 && (
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Sponsors:</span>
            {data.sponsors.map((sponsor) => (
              <span
                key={sponsor.id}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
              >
                {sponsor.name ?? sponsor.email}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={Lightbulb}
          label="Ideas Submitted"
          value={data.kpiSummary?.ideasSubmitted ?? 0}
        />
        <KpiCard icon={Award} label="Ideas Selected" value={data.kpiSummary?.ideasSelected ?? 0} />
        <KpiCard
          icon={TrendingUp}
          label="Participants"
          value={data.kpiSummary?.totalParticipants ?? 0}
        />
        <KpiCard
          icon={MessageSquare}
          label="Comments"
          value={data.kpiSummary?.totalComments ?? 0}
        />
        <KpiCard icon={Vote} label="Votes" value={data.kpiSummary?.totalVotes ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">Timeline</h2>
          <div className="space-y-3">
            <TimelineItem label="Submission Close" date={data.submissionCloseDate} />
            <TimelineItem label="Voting Close" date={data.votingCloseDate} />
            <TimelineItem label="Planned Close" date={data.plannedCloseDate} />
            <TimelineItem label="Launched" date={data.launchedAt} />
            <TimelineItem label="Closed" date={data.closedAt} />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
            Top Ideas & Shortlist
          </h2>
          <p className="text-sm text-gray-500">
            Top ideas and evaluation shortlist will appear here once ideas are submitted and
            evaluated.
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">
        {date ? new Date(date).toLocaleDateString() : "Not set"}
      </span>
    </div>
  );
}
