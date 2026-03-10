/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { KpiCards } from "@/components/dashboard/kpi-cards";
import { TaskList } from "@/components/dashboard/task-list";
import { CampaignCards } from "@/components/dashboard/campaign-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  MyStats,
  TrendingIdeas,
  QuickActions,
} from "@/components/dashboard/sidebar-widgets";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { getDashboardData } from "@/lib/mock-data";

const managerData = getDashboardData("INNOVATION_MANAGER");
const contributorData = getDashboardData("CONTRIBUTOR");

describe("WelcomeHeader", () => {
  it("renders greeting with user first name", () => {
    render(<WelcomeHeader firstName="Sarah" />);
    expect(screen.getByText("Welcome back, Sarah!")).toBeInTheDocument();
  });

  it("renders today's date subtitle", () => {
    render(<WelcomeHeader firstName="Sarah" />);
    expect(
      screen.getByText(/Your innovation pulse for today/),
    ).toBeInTheDocument();
  });
});

describe("KpiCards", () => {
  it("renders all KPI metrics", () => {
    render(<KpiCards metrics={managerData.kpis} />);
    expect(screen.getByText("Active Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Ideas Submitted")).toBeInTheDocument();
    expect(screen.getByText("Pending Evaluations")).toBeInTheDocument();
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
  });

  it("renders metric values", () => {
    render(<KpiCards metrics={managerData.kpis} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("shows change indicators for metrics with change", () => {
    render(<KpiCards metrics={managerData.kpis} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
  });

  it("renders contributor-specific KPIs for contributor role", () => {
    render(<KpiCards metrics={contributorData.kpis} />);
    expect(screen.getByText("My Ideas")).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
  });
});

describe("TaskList", () => {
  it("renders task list with all tasks by default", () => {
    render(<TaskList tasks={managerData.tasks} />);
    const items = screen.getAllByTestId("task-item");
    expect(items).toHaveLength(managerData.tasks.length);
  });

  it("renders tab buttons", () => {
    render(<TaskList tasks={managerData.tasks} />);
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ideas" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Evaluations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Projects" })).toBeInTheDocument();
  });

  it("filters tasks when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskList tasks={managerData.tasks} />);

    await user.click(screen.getByRole("tab", { name: "Evaluations" }));
    const items = screen.getAllByTestId("task-item");
    expect(items).toHaveLength(1);
    expect(screen.getByText("Evaluate 3 ideas")).toBeInTheDocument();
  });

  it("shows empty state for empty filter", async () => {
    const user = userEvent.setup();
    render(
      <TaskList
        tasks={[
          {
            id: "1",
            title: "Test",
            source: "S",
            dueDate: null,
            type: "idea",
            isUrgent: false,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Projects" }));
    expect(screen.getByText("No tasks in this category")).toBeInTheDocument();
  });

  it("shows urgent indicators", () => {
    render(<TaskList tasks={managerData.tasks} />);
    const urgentIndicators = screen.getAllByTestId("urgent-indicator");
    expect(urgentIndicators.length).toBeGreaterThan(0);
  });
});

describe("CampaignCards", () => {
  it("renders all campaign cards", () => {
    render(<CampaignCards campaigns={managerData.campaigns} />);
    const cards = screen.getAllByTestId("campaign-card");
    expect(cards).toHaveLength(3);
  });

  it("displays campaign titles", () => {
    render(<CampaignCards campaigns={managerData.campaigns} />);
    expect(
      screen.getByText("AI-Powered Customer Experience"),
    ).toBeInTheDocument();
    expect(screen.getByText("Green Energy Initiative")).toBeInTheDocument();
    expect(
      screen.getByText("Digital Workplace Transformation"),
    ).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(<CampaignCards campaigns={managerData.campaigns} />);
    expect(screen.getByText("Evaluation")).toBeInTheDocument();
    expect(screen.getByText("Submission")).toBeInTheDocument();
    expect(screen.getByText("Discussion")).toBeInTheDocument();
  });

  it("shows explore all link", () => {
    render(<CampaignCards campaigns={managerData.campaigns} />);
    expect(screen.getByText(/Explore all campaigns/)).toBeInTheDocument();
  });
});

describe("ActivityFeed", () => {
  it("renders all activity items", () => {
    render(<ActivityFeed activities={managerData.activities} />);
    const items = screen.getAllByTestId("activity-item");
    expect(items).toHaveLength(5);
  });

  it("displays actor names and targets", () => {
    render(<ActivityFeed activities={managerData.activities} />);
    expect(screen.getByText("David Park")).toBeInTheDocument();
    expect(screen.getByText("AI-Driven Energy Optimizer")).toBeInTheDocument();
  });

  it("displays activity verbs", () => {
    render(<ActivityFeed activities={managerData.activities} />);
    expect(screen.getByText(/submitted a new idea/)).toBeInTheDocument();
    expect(screen.getByText(/reached HOT! status/)).toBeInTheDocument();
  });

  it("shows timestamps", () => {
    render(<ActivityFeed activities={managerData.activities} />);
    expect(screen.getByText("2h ago")).toBeInTheDocument();
    expect(screen.getByText("4h ago")).toBeInTheDocument();
  });
});

describe("MyStats", () => {
  it("renders all stat entries", () => {
    render(<MyStats stats={managerData.stats} />);
    expect(screen.getByText("Ideas submitted")).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("Evaluations pending")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();
  });

  it("renders stat values", () => {
    render(<MyStats stats={managerData.stats} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
  });
});

describe("TrendingIdeas", () => {
  it("renders trending ideas list", () => {
    render(<TrendingIdeas ideas={managerData.trendingIdeas} />);
    expect(
      screen.getByText("Chatbot with Emotional Intelligence"),
    ).toBeInTheDocument();
    expect(screen.getByText("AI-Driven Energy Optimizer")).toBeInTheDocument();
  });

  it("shows vote and like counts", () => {
    render(<TrendingIdeas ideas={managerData.trendingIdeas} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("89")).toBeInTheDocument();
  });

  it("renders section header with flame icon", () => {
    render(<TrendingIdeas ideas={managerData.trendingIdeas} />);
    expect(screen.getByText("Trending Ideas")).toBeInTheDocument();
  });
});

describe("QuickActions - Role Adaptive", () => {
  it("shows New Campaign button for managers", () => {
    render(<QuickActions roles={["INNOVATION_MANAGER"]} />);
    expect(screen.getByTestId("new-campaign-btn")).toBeInTheDocument();
  });

  it("shows New Campaign button for admins", () => {
    render(<QuickActions roles={["PLATFORM_ADMIN"]} />);
    expect(screen.getByTestId("new-campaign-btn")).toBeInTheDocument();
  });

  it("hides New Campaign button for contributors", () => {
    render(<QuickActions roles={["CONTRIBUTOR"]} />);
    expect(screen.queryByTestId("new-campaign-btn")).not.toBeInTheDocument();
  });

  it("hides New Campaign button for evaluators", () => {
    render(<QuickActions roles={["EVALUATOR"]} />);
    expect(screen.queryByTestId("new-campaign-btn")).not.toBeInTheDocument();
  });

  it("always shows New Idea and Browse Partners buttons", () => {
    render(<QuickActions roles={["CONTRIBUTOR"]} />);
    expect(screen.getByText("New Idea")).toBeInTheDocument();
    expect(screen.getByText("Browse Partners")).toBeInTheDocument();
  });
});

describe("getDashboardData - Role Adaptive Data", () => {
  it("returns manager KPIs for INNOVATION_MANAGER", () => {
    const data = getDashboardData("INNOVATION_MANAGER");
    expect(data.kpis.some((k) => k.label === "Active Campaigns")).toBe(true);
  });

  it("returns contributor KPIs for CONTRIBUTOR", () => {
    const data = getDashboardData("CONTRIBUTOR");
    expect(data.kpis.some((k) => k.label === "My Ideas")).toBe(true);
  });

  it("returns manager data for PLATFORM_ADMIN", () => {
    const data = getDashboardData("PLATFORM_ADMIN");
    expect(data.user.roles).toContain("INNOVATION_MANAGER");
    expect(data.kpis.some((k) => k.label === "Active Campaigns")).toBe(true);
  });

  it("returns manager data by default", () => {
    const data = getDashboardData();
    expect(data.kpis.some((k) => k.label === "Active Campaigns")).toBe(true);
  });

  it("includes all required dashboard sections", () => {
    const data = getDashboardData();
    expect(data.user).toBeDefined();
    expect(data.kpis.length).toBeGreaterThan(0);
    expect(data.tasks.length).toBeGreaterThan(0);
    expect(data.campaigns.length).toBeGreaterThan(0);
    expect(data.activities.length).toBeGreaterThan(0);
    expect(data.trendingIdeas.length).toBeGreaterThan(0);
    expect(data.stats).toBeDefined();
  });
});
