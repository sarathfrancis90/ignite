"use client";

import { useState } from "react";
import { Activity, Plus, Trash2, Phone, Mail, Video, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

type InteractionTypeValue = "NOTE" | "MEETING" | "EMAIL" | "CALL" | "DEMO" | "OTHER";

const INTERACTION_ICONS: Record<InteractionTypeValue, typeof Activity> = {
  NOTE: FileText,
  MEETING: Calendar,
  EMAIL: Mail,
  CALL: Phone,
  DEMO: Video,
  OTHER: Activity,
};

const INTERACTION_COLORS: Record<InteractionTypeValue, string> = {
  NOTE: "bg-gray-100 text-gray-700",
  MEETING: "bg-blue-100 text-blue-700",
  EMAIL: "bg-green-100 text-green-700",
  CALL: "bg-yellow-100 text-yellow-700",
  DEMO: "bg-purple-100 text-purple-700",
  OTHER: "bg-gray-100 text-gray-600",
};

interface UseCaseInteractionsProps {
  useCaseId: string;
}

export function UseCaseInteractions({ useCaseId }: UseCaseInteractionsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [type, setType] = useState<InteractionTypeValue>("NOTE");

  const utils = trpc.useUtils();
  const interactionsQuery = trpc.useCase.listInteractions.useQuery({
    useCaseId,
    limit: 50,
  });

  const createInteraction = trpc.useCase.createInteraction.useMutation({
    onSuccess: () => {
      utils.useCase.listInteractions.invalidate({ useCaseId });
      setSummary("");
      setDetails("");
      setType("NOTE");
      setIsAdding(false);
    },
  });

  const deleteInteraction = trpc.useCase.deleteInteraction.useMutation({
    onSuccess: () => {
      utils.useCase.listInteractions.invalidate({ useCaseId });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    createInteraction.mutate({
      useCaseId,
      type,
      summary: summary.trim(),
      details: details.trim() || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary-600" />
            Interactions Log
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="mr-1 h-4 w-4" />
            Log Interaction
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {(["NOTE", "MEETING", "EMAIL", "CALL", "DEMO", "OTHER"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setType(t)}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Summary..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mb-2"
            />
            <Textarea
              placeholder="Details (optional)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              className="mb-2"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createInteraction.isPending || !summary.trim()}
              >
                Save
              </Button>
            </div>
          </form>
        )}

        {interactionsQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {interactionsQuery.data?.items.map((interaction) => {
            const Icon = INTERACTION_ICONS[interaction.type] ?? Activity;
            const colorClass = INTERACTION_COLORS[interaction.type] ?? "bg-gray-100 text-gray-600";

            return (
              <div
                key={interaction.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${colorClass}`}>
                      {interaction.type}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(interaction.occurredAt).toLocaleString()}
                    </span>
                    {interaction.contact && (
                      <span className="text-xs text-gray-500">
                        with {interaction.contact.firstName} {interaction.contact.lastName}
                      </span>
                    )}
                    <button
                      onClick={() => deleteInteraction.mutate({ id: interaction.id })}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">{interaction.summary}</p>
                  {interaction.details && (
                    <p className="mt-1 text-sm text-gray-600">{interaction.details}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    by {interaction.recordedBy.name ?? interaction.recordedBy.email}
                  </p>
                </div>
              </div>
            );
          })}
          {interactionsQuery.data?.items.length === 0 && !isAdding && (
            <p className="py-4 text-center text-sm text-gray-400">No interactions logged yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
