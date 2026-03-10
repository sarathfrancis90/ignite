"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { trpc } from "@/lib/trpc";

export default function EditOrganizationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const orgQuery = trpc.organization.getById.useQuery({ id: params.id });

  const updateOrganization = trpc.organization.update.useMutation({
    onSuccess: () => {
      void utils.organization.getById.invalidate({ id: params.id });
      router.push(`/partners/${params.id}`);
    },
  });

  if (orgQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (orgQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load organization.</p>
          <Link href="/partners" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Back to Organizations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const org = orgQuery.data;

  if (!org) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/partners/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Edit Organization</h1>
          <p className="mt-1 text-sm text-gray-500">Update details for {org.name}.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            defaultValues={{
              name: org.name,
              description: org.description ?? "",
              websiteUrl: org.websiteUrl ?? "",
              logoUrl: org.logoUrl ?? "",
              industry: org.industry ?? "",
              location: org.location ?? "",
              fundingStage: org.fundingStage ?? "",
              fundingTotal: org.fundingTotal ?? "",
              relationshipStatus: org.relationshipStatus,
              ndaStatus: org.ndaStatus,
              isConfidential: org.isConfidential,
            }}
            onSubmit={(data) => updateOrganization.mutate({ id: params.id, ...data })}
            isSubmitting={updateOrganization.isPending}
            submitLabel="Save Changes"
          />
          {updateOrganization.isError && (
            <p className="mt-4 text-sm text-red-600">{updateOrganization.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
