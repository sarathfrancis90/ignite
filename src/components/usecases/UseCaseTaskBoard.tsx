"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";

const COLUMN_CONFIG: { status: TaskStatusType; label: string; color: string }[] = [
  { status: "TODO", label: "To Do", color: "bg-gray-100" },
  { status: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50" },
  { status: "DONE", label: "Done", color: "bg-green-50" },
];

interface UseCaseTaskBoardProps {
  useCaseId: string;
}

export function UseCaseTaskBoard({ useCaseId }: UseCaseTaskBoardProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const utils = trpc.useUtils();
  const tasksQuery = trpc.useCase.listTasks.useQuery({ useCaseId });

  const createTask = trpc.useCase.createTask.useMutation({
    onSuccess: () => {
      utils.useCase.listTasks.invalidate({ useCaseId });
      setNewTaskTitle("");
    },
  });

  const updateTask = trpc.useCase.updateTask.useMutation({
    onSuccess: () => {
      utils.useCase.listTasks.invalidate({ useCaseId });
    },
  });

  const deleteTask = trpc.useCase.deleteTask.useMutation({
    onSuccess: () => {
      utils.useCase.listTasks.invalidate({ useCaseId });
    },
  });

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTask.mutate({ useCaseId, title: newTaskTitle.trim() });
  }

  function handleMoveTask(taskId: string, newStatus: TaskStatusType) {
    updateTask.mutate({ id: taskId, status: newStatus });
  }

  function handleDeleteTask(taskId: string) {
    if (window.confirm("Delete this task?")) {
      deleteTask.mutate({ id: taskId });
    }
  }

  if (tasksQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasks = tasksQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Task Board</CardTitle>
        <form onSubmit={handleCreateTask} className="mt-2 flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={createTask.isPending || !newTaskTitle.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMN_CONFIG.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.status);
            return (
              <div key={column.status} className={`rounded-lg p-3 ${column.color}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">{column.label}</h4>
                  <Badge variant="outline" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-md border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="shrink-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {task.assignee && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            {task.assignee.name ?? task.assignee.email}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {column.status !== "TODO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              const prevStatus = column.status === "DONE" ? "IN_PROGRESS" : "TODO";
                              handleMoveTask(task.id, prevStatus);
                            }}
                          >
                            &larr;
                          </Button>
                        )}
                        {column.status !== "DONE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              const nextStatus = column.status === "TODO" ? "IN_PROGRESS" : "DONE";
                              handleMoveTask(task.id, nextStatus);
                            }}
                          >
                            &rarr;
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
