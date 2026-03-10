"use client";

import * as React from "react";
import Image from "next/image";
import { Calendar, User, ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { trpc } from "@/lib/trpc";

interface CampaignHeaderProps {
  campaign: {
    id: string;
    title: string;
    teaser: string | null;
    bannerUrl: string | null;
    status: "DRAFT" | "SEEDING" | "SUBMISSION" | "DISCUSSION_VOTING" | "EVALUATION" | "CLOSED";
    submissionCloseDate: string | null;
    plannedCloseDate: string | null;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    createdAt: string;
  };
}

export function CampaignHeader({ campaign }: CampaignHeaderProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const copyMutation = trpc.campaign.copy.useMutation();

  const handleCopy = () => {
    copyMutation.mutate(
      { sourceCampaignId: campaign.id, title: `${campaign.title} (Copy)` },
      {
        onSuccess: (data: { id: string }) => {
          void utils.campaign.list.invalidate();
          router.push(`/campaigns/${data.id}`);
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>

      {campaign.bannerUrl ? (
        <div className="relative mb-6 h-48 w-full overflow-hidden rounded-xl bg-gray-100 md:h-64">
          <Image src={campaign.bannerUrl} alt={campaign.title} fill className="object-cover" />
        </div>
      ) : (
        <div className="mb-6 h-48 w-full rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 md:h-64" />
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-gray-900 md:text-3xl">
              {campaign.title}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.teaser && <p className="max-w-2xl text-gray-500">{campaign.teaser}</p>}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {campaign.createdBy.name ?? campaign.createdBy.email}
            </span>
            {campaign.submissionCloseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Submissions close {new Date(campaign.submissionCloseDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={copyMutation.isPending}>
            <Copy className="mr-2 h-4 w-4" />
            {copyMutation.isPending ? "Copying..." : "Copy Campaign"}
          </Button>
          {campaign.status === "DRAFT" && (
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              Edit Campaign
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
