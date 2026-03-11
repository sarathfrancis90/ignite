"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface UseCaseFormProps {
  organizationId: string;
  initialData?: {
    id: string;
    title: string;
    description: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    tags: string[];
    estimatedValue: string | null;
    targetDate: string | null;
  };
}

export function UseCaseForm({ organizationId, initialData }: UseCaseFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    initialData?.priority ?? "MEDIUM",
  );
  const [tagsInput, setTagsInput] = useState(initialData?.tags.join(", ") ?? "");
  const [estimatedValue, setEstimatedValue] = useState(initialData?.estimatedValue ?? "");
  const [targetDate, setTargetDate] = useState(
    initialData?.targetDate ? initialData.targetDate.split("T")[0] : "",
  );

  const createMutation = trpc.useCase.create.useMutation({
    onSuccess: (data: { id: string }) => {
      router.push(`/partners/${organizationId}/usecases/${data.id}`);
    },
  });

  const updateMutation = trpc.useCase.update.useMutation({
    onSuccess: () => {
      router.push(`/partners/${organizationId}/usecases/${initialData?.id}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing && initialData) {
      updateMutation.mutate({
        id: initialData.id,
        title,
        description: description || null,
        priority,
        tags,
        estimatedValue: estimatedValue || null,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      });
    } else {
      createMutation.mutate({
        organizationId,
        title,
        description: description || undefined,
        priority,
        tags,
        estimatedValue: estimatedValue || undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Use Case" : "New Use Case"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error.message}
            </div>
          )}

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI-powered supply chain optimization"
              required
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the use case..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. AI, logistics, automation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimatedValue">Estimated Value</Label>
              <Input
                id="estimatedValue"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="e.g. $500K"
              />
            </div>
            <div>
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Use Case"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
