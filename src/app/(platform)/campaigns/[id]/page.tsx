"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Lightbulb, BarChart3, Settings, LayoutDashboard, MessageSquare } from "lucide-react";
import { CampaignHeader } from "@/components/campaigns/CampaignHeader";
import { CampaignLifecycleBar } from "@/components/campaigns/CampaignLifecycleBar";
import { CampaignPhaseControls } from "@/components/campaigns/CampaignPhaseControls";
import { CampaignCockpit } from "@/components/campaigns/CampaignCockpit";
import { CopyCampaignButton } from "@/components/campaigns/CopyCampaignButton";
import { trpc } from "@/lib/trpc";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "evaluation", label: "Evaluation", icon: BarChart3 },
  { id: "cockpit", label: "Cockpit", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");

  const campaignQuery = trpc.campaign.getById.useQuery({ id: params.id }, { enabled: !!params.id });

  if (campaignQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
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

  return (
    <div className="space-y-6">
      <CampaignHeader campaign={campaign} />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Campaign tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 font-display text-sm font-semibold text-gray-900">
                Campaign Lifecycle
              </h2>
              <CampaignLifecycleBar
                currentStatus={campaign.status}
                hasSeedingPhase={campaign.hasSeedingPhase}
                hasDiscussionPhase={campaign.hasDiscussionPhase}
              />
              <div className="mt-4">
                <CampaignPhaseControls
                  campaignId={campaign.id}
                  currentStatus={campaign.status}
                  onTransitionComplete={() => void campaignQuery.refetch()}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
                Campaign Description
              </h2>
              {campaign.description ? (
                <div className="prose prose-sm max-w-none text-gray-600">
                  {campaign.description}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No description provided.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Status" value={formatStatus(campaign.status)} />
              <StatCard label="Type" value={formatSubmissionType(campaign.submissionType)} />
              <StatCard
                label="Submission Close"
                value={
                  campaign.submissionCloseDate
                    ? new Date(campaign.submissionCloseDate).toLocaleDateString()
                    : "Not set"
                }
              />
              <StatCard label="Created" value={new Date(campaign.createdAt).toLocaleDateString()} />
            </div>

            <div className="flex gap-3">
              <CopyCampaignButton campaignId={campaign.id} campaignTitle={campaign.title} />
            </div>
          </div>
        )}

        {activeTab === "ideas" && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Lightbulb className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Ideas</h3>
            <p className="mt-2 text-sm text-gray-500">
              Idea management will be available in a future story.
            </p>
          </div>
        )}

        {activeTab === "evaluation" && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Evaluation</h3>
            <p className="mt-2 text-sm text-gray-500">
              Evaluation sessions will be available in a future story.
            </p>
          </div>
        )}

        {activeTab === "cockpit" && <CampaignCockpit campaignId={campaign.id} />}

        {activeTab === "settings" && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Settings</h3>
            <p className="mt-2 text-sm text-gray-500">
              Advanced campaign settings will be available in a future story.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SEEDING: "Seeding",
    SUBMISSION: "Submission",
    DISCUSSION_VOTING: "Discussion & Voting",
    EVALUATION: "Evaluation",
    CLOSED: "Closed",
  };
  return labels[status] ?? status;
}

function formatSubmissionType(type: string): string {
  const labels: Record<string, string> = {
    CALL_FOR_IDEAS: "Call for Ideas",
    CALL_FOR_PROPOSALS: "Call for Proposals",
    CALL_FOR_GENERIC: "Call for Generic",
  };
  return labels[type] ?? type;
}
