"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UseCaseCard } from "@/components/usecases/UseCaseCard";
import { UseCasePipelineFunnel } from "@/components/usecases/UseCasePipelineFunnel";
import { trpc } from "@/lib/trpc";

interface UseCaseListItem {
  id: string;
  title: string;
  description: string | null;
  status: "IDENTIFIED" | "QUALIFICATION" | "EVALUATION" | "PILOT" | "PARTNERSHIP" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  organization: { id: string; name: string };
  _count: {
    teamMembers: number;
    tasks: number;
    discussions: number;
    attachments: number;
    interactions: number;
  };
  targetDate: Date | string | null;
  createdAt: Date | string;
}

function UseCaseList({
  items,
  organizationId,
}: {
  items: UseCaseListItem[];
  organizationId: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-500">No use cases yet.</p>
        <Link href={`/partners/${organizationId}/usecases/new`}>
          <Button size="sm" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create First Use Case
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((useCase) => (
        <UseCaseCard
          key={useCase.id}
          useCase={{
            id: useCase.id,
            title: useCase.title,
            description: useCase.description,
            status: useCase.status,
            priority: useCase.priority,
            organization: useCase.organization,
            _count: useCase._count,
            targetDate: useCase.targetDate ? String(useCase.targetDate) : null,
            createdAt: String(useCase.createdAt),
          }}
          organizationId={organizationId}
        />
      ))}
    </div>
  );
}

export default function OrganizationUseCasesPage() {
  const params = useParams<{ id: string }>();

  const useCasesQuery = trpc.useCase.list.useQuery({
    organizationId: params.id,
    limit: 50,
  });

  const orgQuery = trpc.organization.getById.useQuery({ id: params.id });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/partners/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {orgQuery.data?.name ?? "Organization"}
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Use Cases</h1>
            <p className="mt-1 text-sm text-gray-500">
              Pipeline for {orgQuery.data?.name ?? "this organization"}
            </p>
          </div>
        </div>
        <Link href={`/partners/${params.id}/usecases/new`}>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Use Case
          </Button>
        </Link>
      </div>

      {/* Pipeline Funnel */}
      <UseCasePipelineFunnel organizationId={params.id} />

      {/* Use Cases List */}
      {useCasesQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {useCasesQuery.data && (
        <UseCaseList items={useCasesQuery.data.items} organizationId={params.id} />
      )}
    </div>
  );
}
