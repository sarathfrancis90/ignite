import { getDashboardData } from "@/lib/mock-data";
import {
  WelcomeHeader,
  KpiCards,
  TaskList,
  CampaignCards,
  ActivityFeed,
  MyStats,
  TrendingIdeas,
  QuickActions,
} from "@/components/dashboard";

export const metadata = {
  title: "Dashboard | InnoFlow",
  description: "Your personalized innovation dashboard",
};

export default function DashboardPage() {
  const data = getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <main className="space-y-6 lg:col-span-2">
            <WelcomeHeader firstName={data.user.firstName} />
            <KpiCards metrics={data.kpis} />
            <TaskList tasks={data.tasks} />
            <CampaignCards campaigns={data.campaigns} />
            <ActivityFeed activities={data.activities} />
          </main>

          {/* Sidebar */}
          <aside className="space-y-6">
            <MyStats stats={data.stats} />
            <TrendingIdeas ideas={data.trendingIdeas} />
            <QuickActions roles={data.user.roles} />
          </aside>
        </div>
      </div>
    </div>
  );
}
