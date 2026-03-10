export type GlobalRole =
  | "PLATFORM_ADMIN"
  | "INNOVATION_MANAGER"
  | "CAMPAIGN_MANAGER"
  | "CONTRIBUTOR"
  | "EVALUATOR"
  | "MODERATOR"
  | "EXTERNAL_USER"
  | "GUEST";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  roles: GlobalRole[];
  isInternal: boolean;
}

export interface KpiMetric {
  label: string;
  value: number;
  change?: number;
  icon: string;
  color: string;
}

export type TaskType = "idea" | "evaluation" | "project" | "moderation";

export interface DashboardTask {
  id: string;
  title: string;
  source: string;
  dueDate: string | null;
  type: TaskType;
  isUrgent: boolean;
}

export type CampaignStatus =
  | "DRAFT"
  | "SEEDING"
  | "SUBMISSION"
  | "DISCUSSION"
  | "EVALUATION"
  | "CLOSED";

export interface CampaignCard {
  id: string;
  title: string;
  status: CampaignStatus;
  sponsor: string;
  bannerColor: string;
  ideasCount: number;
  commentsCount: number;
  viewsCount: number;
  participationPercent: number;
  daysLeft: number;
}

export type ActivityType =
  | "idea_submitted"
  | "comment_added"
  | "idea_hot"
  | "evaluation_completed"
  | "use_case_created";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: string;
  target: string;
  timestamp: string;
}

export interface TrendingIdea {
  id: string;
  title: string;
  votes: number;
  likes: number;
}

export interface UserStats {
  ideasSubmitted: number;
  comments: number;
  evaluationsPending: number;
  activeProjects: number;
}

export interface DashboardData {
  user: User;
  kpis: KpiMetric[];
  tasks: DashboardTask[];
  campaigns: CampaignCard[];
  activities: ActivityItem[];
  trendingIdeas: TrendingIdea[];
  stats: UserStats;
}
