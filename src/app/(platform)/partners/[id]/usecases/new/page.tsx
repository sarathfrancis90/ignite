"use client";

import { useParams } from "next/navigation";
import { UseCaseForm } from "@/components/usecases/UseCaseForm";

export default function NewUseCasePage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-2xl">
      <UseCaseForm organizationId={params.id} />
    </div>
  );
}
