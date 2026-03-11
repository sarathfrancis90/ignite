"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ArrowRight,
  Archive,
  ArchiveRestore,
  DollarSign,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UseCaseStatusBadge, UseCasePriorityBadge } from "@/components/usecases/UseCaseStatusBadge";
import { UseCasePipelineProgress } from "@/components/usecases/UseCasePipelineProgress";
import { UseCaseTaskBoard } from "@/components/usecases/UseCaseTaskBoard";
import { UseCaseDiscussions } from "@/components/usecases/UseCaseDiscussions";
import { UseCaseInteractions } from "@/components/usecases/UseCaseInteractions";
import { trpc } from "@/lib/trpc";

const NEXT_STATUS_LABELS: Record<string, string> = {
  QUALIFICATION: "Move to Qualification",
  EVALUATION: "Move to Evaluation",
  PILOT: "Start Pilot",
  PARTNERSHIP: "Establish Partnership",
};

export default function UseCaseDetailPage() {
  const params = useParams<{ id: string; usecaseId: string }>();
  const router = useRouter();

  const utils = trpc.useUtils();
  const useCaseQuery = trpc.useCase.getById.useQuery({ id: params.usecaseId });

  const transitionMutation = trpc.useCase.transition.useMutation({
    onSuccess: () => {
      utils.useCase.getById.invalidate({ id: params.usecaseId });
    },
  });

  const archiveMutation = trpc.useCase.archive.useMutation({
    onSuccess: () => {
      utils.useCase.getById.invalidate({ id: params.usecaseId });
    },
  });

  const unarchiveMutation = trpc.useCase.unarchive.useMutation({
    onSuccess: () => {
      utils.useCase.getById.invalidate({ id: params.usecaseId });
    },
  });

  const deleteMutation = trpc.useCase.delete.useMutation({
    onSuccess: () => {
      router.push(`/partners/${params.id}/usecases`);
    },
  });

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete this use case? This cannot be undone.")) {
      deleteMutation.mutate({ id: params.usecaseId });
    }
  }

  function handleArchive() {
    const reason = window.prompt("Archive reason (optional):");
    archiveMutation.mutate({ id: params.usecaseId, reason: reason ?? undefined });
  }

  if (useCaseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (useCaseQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            {useCaseQuery.error.message ?? "Failed to load use case."}
          </p>
          <Link href={`/partners/${params.id}/usecases`} className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Back to Use Cases
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const uc = useCaseQuery.data;
  if (!uc) return null;

  const nextStatuses = getNextStatuses(uc.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/partners/${params.id}/usecases`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">{uc.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <UseCaseStatusBadge status={uc.status} />
              <UseCasePriorityBadge priority={uc.priority} />
              <span className="text-xs text-gray-400">{uc.organization.name}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/partners/${params.id}/usecases/${params.usecaseId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Pipeline Progress */}
      <Card>
        <CardContent className="pt-6">
          <UseCasePipelineProgress currentStatus={uc.status} />
          <div className="mt-4 flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                size="sm"
                onClick={() =>
                  transitionMutation.mutate({ id: params.usecaseId, targetStatus: status })
                }
                disabled={transitionMutation.isPending}
              >
                <ArrowRight className="mr-1 h-4 w-4" />
                {NEXT_STATUS_LABELS[status] ?? `Move to ${status}`}
              </Button>
            ))}
            {uc.status !== "ARCHIVED" && uc.status !== "PARTNERSHIP" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={archiveMutation.isPending}
              >
                <Archive className="mr-1 h-4 w-4" />
                Archive
              </Button>
            )}
            {uc.status === "ARCHIVED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unarchiveMutation.mutate({ id: params.usecaseId })}
                disabled={unarchiveMutation.isPending}
              >
                <ArchiveRestore className="mr-1 h-4 w-4" />
                Unarchive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {uc.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{uc.description}</dd>
              </div>
            )}

            {uc.estimatedValue && (
              <div>
                <dt className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <DollarSign className="h-3.5 w-3.5" />
                  Estimated Value
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{uc.estimatedValue}</dd>
              </div>
            )}

            {uc.targetDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Target Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(uc.targetDate).toLocaleDateString()}
                </dd>
              </div>
            )}

            {uc.tags.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {uc.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
          </div>

          {/* Team Members */}
          {uc.teamMembers.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <dt className="text-sm font-medium text-gray-500">Team</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {uc.teamMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {m.user.name ?? m.user.email}
                    <span className="ml-1 text-gray-400">({m.role})</span>
                  </span>
                ))}
              </dd>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
            Created by {uc.createdBy.name ?? uc.createdBy.email} on{" "}
            {new Date(uc.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Task Board */}
      <UseCaseTaskBoard useCaseId={params.usecaseId} />

      {/* Discussions */}
      <UseCaseDiscussions useCaseId={params.usecaseId} />

      {/* Interactions Log */}
      <UseCaseInteractions useCaseId={params.usecaseId} />
    </div>
  );
}

function getNextStatuses(
  currentStatus: string,
): ("IDENTIFIED" | "QUALIFICATION" | "EVALUATION" | "PILOT" | "PARTNERSHIP" | "ARCHIVED")[] {
  const map: Record<string, ("QUALIFICATION" | "EVALUATION" | "PILOT" | "PARTNERSHIP")[]> = {
    IDENTIFIED: ["QUALIFICATION"],
    QUALIFICATION: ["EVALUATION"],
    EVALUATION: ["PILOT"],
    PILOT: ["PARTNERSHIP"],
    PARTNERSHIP: [],
    ARCHIVED: [],
  };
  return map[currentStatus] ?? [];
}
