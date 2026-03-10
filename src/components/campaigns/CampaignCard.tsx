"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface CampaignCardProps {
  campaign: {
    id: string;
    title: string;
    teaser: string | null;
    bannerUrl: string | null;
    status: "DRAFT" | "SEEDING" | "SUBMISSION" | "DISCUSSION_VOTING" | "EVALUATION" | "CLOSED";
    submissionCloseDate: string | null;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    createdAt: string;
  };
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        {campaign.bannerUrl ? (
          <div className="relative h-40 w-full overflow-hidden rounded-t-xl bg-gray-100">
            <Image src={campaign.bannerUrl} alt={campaign.title} fill className="object-cover" />
          </div>
        ) : (
          <div className="h-40 w-full rounded-t-xl bg-gradient-to-br from-primary-50 to-primary-100" />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base group-hover:text-primary-600">
              {campaign.title}
            </CardTitle>
            <StatusBadge status={campaign.status} />
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {campaign.teaser && (
            <p className="line-clamp-2 text-sm text-gray-500">{campaign.teaser}</p>
          )}
        </CardContent>
        <CardFooter className="text-xs text-gray-400">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {campaign.createdBy.name ?? campaign.createdBy.email}
            </span>
            {campaign.submissionCloseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(campaign.submissionCloseDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
