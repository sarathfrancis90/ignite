import {
  Flame,
  Star,
  Heart,
  Lightbulb,
  Megaphone,
  Building,
} from "lucide-react";
import type { UserStats, TrendingIdea, GlobalRole } from "@/types/dashboard";
import { isManagerRole } from "@/lib/mock-data";

interface MyStatsProps {
  stats: UserStats;
}

export function MyStats({ stats }: MyStatsProps) {
  const entries: { label: string; value: number }[] = [
    { label: "Ideas submitted", value: stats.ideasSubmitted },
    { label: "Comments", value: stats.comments },
    { label: "Evaluations pending", value: stats.evaluationsPending },
    { label: "Active projects", value: stats.activeProjects },
  ];

  return (
    <div
      className="rounded-lg border border-gray-100 bg-white p-4 shadow-xs"
      data-testid="my-stats"
    >
      <h2 className="text-base font-semibold text-gray-900">My Stats</h2>
      <dl className="mt-3 space-y-2">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">{entry.label}</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {entry.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface TrendingIdeasProps {
  ideas: TrendingIdea[];
}

export function TrendingIdeas({ ideas }: TrendingIdeasProps) {
  return (
    <div
      className="rounded-lg border border-gray-100 bg-white p-4 shadow-xs"
      data-testid="trending-ideas"
    >
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
        <Flame size={18} className="text-orange-500" />
        Trending Ideas
      </h2>
      <ul className="mt-3 space-y-3">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <p className="text-sm font-medium text-gray-900 hover:text-indigo-600 cursor-pointer">
              {idea.title}
            </p>
            <div className="mt-0.5 flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Star size={12} /> {idea.votes}
              </span>
              <span className="flex items-center gap-1">
                <Heart size={12} /> {idea.likes}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface QuickActionsProps {
  roles: GlobalRole[];
}

export function QuickActions({ roles }: QuickActionsProps) {
  const showNewCampaign = isManagerRole(roles);

  return (
    <div
      className="rounded-lg border border-gray-100 bg-white p-4 shadow-xs"
      data-testid="quick-actions"
    >
      <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
      <div className="mt-3 flex flex-col gap-2">
        <button className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Lightbulb size={16} />
          New Idea
        </button>
        {showNewCampaign && (
          <button
            className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="new-campaign-btn"
          >
            <Megaphone size={16} />
            New Campaign
          </button>
        )}
        <button className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Building size={16} />
          Browse Partners
        </button>
      </div>
    </div>
  );
}
