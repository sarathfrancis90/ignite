"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { trpc } from "@/lib/trpc";

export default function NewOrganizationPage() {
  const router = useRouter();

  const createOrganization = trpc.organization.create.useMutation({
    onSuccess: (data) => {
      router.push(`/partners/${data.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/partners">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">New Organization</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new partner organization to the database.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            onSubmit={(data) => createOrganization.mutate(data)}
            isSubmitting={createOrganization.isPending}
            submitLabel="Create Organization"
          />
          {createOrganization.isError && (
            <p className="mt-4 text-sm text-red-600">{createOrganization.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
