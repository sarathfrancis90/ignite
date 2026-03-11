"use client";

import { useParams } from "next/navigation";
import { UseCaseForm } from "@/components/usecases/UseCaseForm";
import { trpc } from "@/lib/trpc";

export default function EditUseCasePage() {
  const params = useParams<{ id: string; usecaseId: string }>();

  const useCaseQuery = trpc.useCase.getById.useQuery({ id: params.usecaseId });

  if (useCaseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (useCaseQuery.isError || !useCaseQuery.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load use case.</p>
        </div>
      </div>
    );
  }

  const uc = useCaseQuery.data;

  return (
    <div className="mx-auto max-w-2xl">
      <UseCaseForm
        organizationId={params.id}
        initialData={{
          id: uc.id,
          title: uc.title,
          description: uc.description,
          priority: uc.priority,
          tags: uc.tags,
          estimatedValue: uc.estimatedValue,
          targetDate: uc.targetDate ? String(uc.targetDate) : null,
        }}
      />
    </div>
  );
}
