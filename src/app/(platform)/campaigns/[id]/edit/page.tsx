"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";

export default function CampaignEditPage() {
  const params = useParams<{ id: string }>();
  const campaignQuery = trpc.campaign.getById.useQuery({ id: params.id }, { enabled: !!params.id });

  if (campaignQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="flex gap-8">
          <div className="w-64 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (campaignQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">
          {campaignQuery.error.message === "Campaign not found"
            ? "This campaign does not exist."
            : "Failed to load campaign. Please try again."}
        </p>
      </div>
    );
  }

  if (!campaignQuery.data) return null;

  const campaign = campaignQuery.data;

  if (campaign.status !== "DRAFT") {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
        <p className="text-sm text-yellow-700">Campaign can only be edited in Draft status.</p>
        <Link
          href={`/campaigns/${campaign.id}`}
          className="mt-2 inline-block text-sm text-primary-600 hover:underline"
        >
          Back to Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaign
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Megaphone className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-gray-900">Edit Campaign</h1>
              <p className="text-sm text-gray-500">{campaign.title}</p>
            </div>
          </div>
        </div>
      </div>

      <CampaignWizard campaign={campaign} />
    </div>
  );
}
