"use client";

import { useState } from "react";
import { Lightbulb, ClipboardCheck, FolderKanban, Shield } from "lucide-react";
import type { DashboardTask, TaskType } from "@/types/dashboard";

const taskTypeIcons: Record<
  TaskType,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  idea: Lightbulb,
  evaluation: ClipboardCheck,
  project: FolderKanban,
  moderation: Shield,
};

const taskTypeColors: Record<TaskType, string> = {
  idea: "bg-amber-50 text-amber-600",
  evaluation: "bg-rose-50 text-rose-500",
  project: "bg-emerald-50 text-emerald-600",
  moderation: "bg-indigo-50 text-indigo-600",
};

type TabFilter = "all" | TaskType;

interface TaskListProps {
  tasks: DashboardTask[];
}

export function TaskList({ tasks }: TaskListProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "idea", label: "Ideas" },
    { key: "evaluation", label: "Evaluations" },
    { key: "project", label: "Projects" },
  ];

  const filtered =
    activeTab === "all" ? tasks : tasks.filter((t) => t.type === activeTab);

  return (
    <div
      className="rounded-lg border border-gray-100 bg-white shadow-xs"
      data-testid="task-list"
    >
      <div className="border-b border-gray-100 px-4 pt-4">
        <h2 className="text-base font-semibold text-gray-900">My Tasks</h2>
        <div className="mt-3 flex gap-4" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-50 px-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No tasks in this category
          </p>
        ) : (
          filtered.map((task) => {
            const Icon = taskTypeIcons[task.type];
            const colorClass = taskTypeColors[task.type];
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-3"
                data-testid="task-item"
              >
                <div className={`rounded-md p-2 ${colorClass}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {task.title}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {task.source}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {task.dueDate && (
                    <span className="text-xs text-gray-400">
                      {task.dueDate}
                    </span>
                  )}
                  {task.isUrgent && (
                    <span
                      className="h-2 w-2 rounded-full bg-rose-500"
                      title="Urgent"
                      data-testid="urgent-indicator"
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
