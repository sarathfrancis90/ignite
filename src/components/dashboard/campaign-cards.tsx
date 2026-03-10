import { Lightbulb, MessageCircle, Eye, User } from "lucide-react";
import type { CampaignCard, CampaignStatus } from "@/types/dashboard";

const statusStyles: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SEEDING: "bg-purple-100 text-purple-700",
  SUBMISSION: "bg-blue-100 text-blue-700",
  DISCUSSION: "bg-amber-100 text-amber-700",
  EVALUATION: "bg-indigo-100 text-indigo-700",
  CLOSED: "bg-gray-200 text-gray-500",
};

function statusLabel(status: CampaignStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

interface CampaignCardsProps {
  campaigns: CampaignCard[];
}

export function CampaignCards({ campaigns }: CampaignCardsProps) {
  return (
    <div data-testid="campaign-cards">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Active Campaigns
        </h2>
        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Explore all campaigns &rarr;
        </button>
      </div>
      <div className="mt-3 flex gap-3.5 overflow-x-auto pb-2">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="w-[260px] min-w-[260px] rounded-lg border border-gray-100 bg-white shadow-xs"
            data-testid="campaign-card"
          >
            <div
              className="h-20 rounded-t-lg"
              style={{
                background: `linear-gradient(135deg, ${campaign.bannerColor}, ${campaign.bannerColor}88)`,
              }}
            />
            <div className="p-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[campaign.status]}`}
              >
                {statusLabel(campaign.status)}
              </span>
              <h3 className="mt-1.5 truncate text-sm font-semibold text-gray-900">
                {campaign.title}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                <User size={12} />
                <span>{campaign.sponsor}</span>
              </div>
              <div className="mt-2.5 flex gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Lightbulb size={12} /> {campaign.ideasCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={12} /> {campaign.commentsCount}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {campaign.viewsCount}
                </span>
              </div>
              <div className="mt-2.5">
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${campaign.participationPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {campaign.participationPercent}% participation &middot;{" "}
                  {campaign.daysLeft} days left
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
