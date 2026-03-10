import type {
  User,
  KpiMetric,
  DashboardTask,
  CampaignCard,
  ActivityItem,
  TrendingIdea,
  UserStats,
  DashboardData,
  GlobalRole,
} from "@/types/dashboard";

const managerUser: User = {
  id: "user-1",
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah.chen@innoflow.io",
  avatarUrl: null,
  roles: ["INNOVATION_MANAGER"],
  isInternal: true,
};

const contributorUser: User = {
  id: "user-2",
  firstName: "Alex",
  lastName: "Rivera",
  email: "alex.rivera@innoflow.io",
  avatarUrl: null,
  roles: ["CONTRIBUTOR"],
  isInternal: true,
};

const managerKpis: KpiMetric[] = [
  {
    label: "Active Campaigns",
    value: 5,
    change: 2,
    icon: "megaphone",
    color: "#4f46e5",
  },
  {
    label: "Ideas Submitted",
    value: 47,
    change: 12,
    icon: "lightbulb",
    color: "#f59e0b",
  },
  {
    label: "Pending Evaluations",
    value: 8,
    icon: "clipboard-check",
    color: "#f43f5e",
  },
  {
    label: "Active Projects",
    value: 3,
    change: 1,
    icon: "folder-kanban",
    color: "#10b981",
  },
];

const contributorKpis: KpiMetric[] = [
  {
    label: "My Ideas",
    value: 6,
    change: 2,
    icon: "lightbulb",
    color: "#f59e0b",
  },
  {
    label: "Pending Reviews",
    value: 2,
    icon: "clipboard-check",
    color: "#f43f5e",
  },
  {
    label: "Active Projects",
    value: 1,
    change: 1,
    icon: "folder-kanban",
    color: "#10b981",
  },
  {
    label: "Comments",
    value: 23,
    change: 5,
    icon: "message-circle",
    color: "#6366f1",
  },
];

const tasks: DashboardTask[] = [
  {
    id: "task-1",
    title: "Evaluate 3 ideas",
    source: "AI-Powered Customer Experience",
    dueDate: "2026-03-15",
    type: "evaluation",
    isUrgent: true,
  },
  {
    id: "task-2",
    title: "Review coach feedback",
    source: "Green Energy Initiative",
    dueDate: "2026-03-18",
    type: "idea",
    isUrgent: false,
  },
  {
    id: "task-3",
    title: "Update project milestones",
    source: "Smart Logistics Platform",
    dueDate: "2026-03-20",
    type: "project",
    isUrgent: false,
  },
  {
    id: "task-4",
    title: "Submit idea refinement",
    source: "Digital Workplace Transformation",
    dueDate: "2026-03-12",
    type: "idea",
    isUrgent: true,
  },
];

const campaigns: CampaignCard[] = [
  {
    id: "camp-1",
    title: "AI-Powered Customer Experience",
    status: "EVALUATION",
    sponsor: "Maria Johnson",
    bannerColor: "#6366f1",
    ideasCount: 24,
    commentsCount: 156,
    viewsCount: 1240,
    participationPercent: 78,
    daysLeft: 5,
  },
  {
    id: "camp-2",
    title: "Green Energy Initiative",
    status: "SUBMISSION",
    sponsor: "Thomas Schmidt",
    bannerColor: "#10b981",
    ideasCount: 12,
    commentsCount: 89,
    viewsCount: 780,
    participationPercent: 45,
    daysLeft: 14,
  },
  {
    id: "camp-3",
    title: "Digital Workplace Transformation",
    status: "DISCUSSION",
    sponsor: "Lisa Park",
    bannerColor: "#f59e0b",
    ideasCount: 31,
    commentsCount: 203,
    viewsCount: 2100,
    participationPercent: 62,
    daysLeft: 21,
  },
];

const activities: ActivityItem[] = [
  {
    id: "act-1",
    type: "idea_submitted",
    actor: "David Park",
    target: "AI-Driven Energy Optimizer",
    timestamp: "2h ago",
  },
  {
    id: "act-2",
    type: "idea_hot",
    actor: "Omar Hassan",
    target: "Chatbot with Emotional Intelligence",
    timestamp: "4h ago",
  },
  {
    id: "act-3",
    type: "evaluation_completed",
    actor: "Rachel Green",
    target: "AI-Powered Customer Experience",
    timestamp: "6h ago",
  },
  {
    id: "act-4",
    type: "comment_added",
    actor: "James Wilson",
    target: "Sustainable Packaging Solution",
    timestamp: "1d ago",
  },
  {
    id: "act-5",
    type: "use_case_created",
    actor: "Nina Patel",
    target: "Predictive Maintenance for Manufacturing",
    timestamp: "2d ago",
  },
];

const trendingIdeas: TrendingIdea[] = [
  {
    id: "idea-1",
    title: "Chatbot with Emotional Intelligence",
    votes: 42,
    likes: 89,
  },
  { id: "idea-2", title: "AI-Driven Energy Optimizer", votes: 38, likes: 72 },
  {
    id: "idea-3",
    title: "Smart Waste Management System",
    votes: 31,
    likes: 65,
  },
  {
    id: "idea-4",
    title: "AR-Enhanced Training Platform",
    votes: 28,
    likes: 54,
  },
  {
    id: "idea-5",
    title: "Predictive Supply Chain Analytics",
    votes: 25,
    likes: 48,
  },
];

const managerStats: UserStats = {
  ideasSubmitted: 12,
  comments: 45,
  evaluationsPending: 8,
  activeProjects: 3,
};

const contributorStats: UserStats = {
  ideasSubmitted: 6,
  comments: 23,
  evaluationsPending: 2,
  activeProjects: 1,
};

function isManagerRole(roles: GlobalRole[]): boolean {
  return roles.some((r) =>
    ["PLATFORM_ADMIN", "INNOVATION_MANAGER", "CAMPAIGN_MANAGER"].includes(r),
  );
}

export function getDashboardData(userRole?: GlobalRole): DashboardData {
  const useManager =
    !userRole ||
    ["PLATFORM_ADMIN", "INNOVATION_MANAGER", "CAMPAIGN_MANAGER"].includes(
      userRole,
    );

  return {
    user: useManager ? managerUser : contributorUser,
    kpis: useManager ? managerKpis : contributorKpis,
    tasks,
    campaigns,
    activities,
    trendingIdeas,
    stats: useManager ? managerStats : contributorStats,
  };
}

export { isManagerRole };
