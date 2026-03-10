"use client";

import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SponsorView } from "@/components/campaigns/SponsorView";

export default function CampaignSponsorPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>
      <SponsorView campaignId={params.id} />
    </div>
  );
}
