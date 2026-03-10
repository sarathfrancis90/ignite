"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Globe,
  MapPin,
  Building2,
  Lock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelationshipBadge, NdaBadge } from "@/components/organizations/OrganizationStatusBadge";
import { ContactList } from "@/components/organizations/ContactList";
import { trpc } from "@/lib/trpc";

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const orgQuery = trpc.organization.getById.useQuery({ id: params.id });
  const deleteOrg = trpc.organization.delete.useMutation({
    onSuccess: () => {
      router.push("/partners");
    },
  });

  function handleDelete() {
    if (
      window.confirm(
        "Are you sure you want to delete this organization? This will also delete all contacts.",
      )
    ) {
      deleteOrg.mutate({ id: params.id });
    }
  }

  if (orgQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (orgQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            {orgQuery.error.message ?? "Failed to load organization."}
          </p>
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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/partners">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">{org.name}</h1>
              {org.isConfidential && <Lock className="h-5 w-5 text-gray-400" />}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <RelationshipBadge status={org.relationshipStatus} />
              <NdaBadge status={org.ndaStatus} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/partners/${params.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteOrg.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary-600" />
            Organization Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {org.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {org.description}
                </dd>
              </div>
            )}

            {org.industry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Industry</dt>
                <dd className="mt-1 text-sm text-gray-900">{org.industry}</dd>
              </div>
            )}

            {org.location && (
              <div>
                <dt className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Location
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{org.location}</dd>
              </div>
            )}

            {org.websiteUrl && isSafeUrl(org.websiteUrl) && (
              <div>
                <dt className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </dt>
                <dd className="mt-1 text-sm">
                  <a
                    href={org.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {org.websiteUrl}
                  </a>
                </dd>
              </div>
            )}

            {(org.fundingStage || org.fundingTotal) && (
              <div>
                <dt className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <DollarSign className="h-3.5 w-3.5" />
                  Funding
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {[org.fundingStage, org.fundingTotal].filter(Boolean).join(" - ")}
                </dd>
              </div>
            )}

            {org.foundedYear && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Founded</dt>
                <dd className="mt-1 text-sm text-gray-900">{org.foundedYear}</dd>
              </div>
            )}

            {org.employeeCount && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Employees</dt>
                <dd className="mt-1 text-sm text-gray-900">{org.employeeCount}</dd>
              </div>
            )}
          </div>

          {org.managers.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <dt className="text-sm font-medium text-gray-500">Managers</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {org.managers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {m.user.name ?? m.user.email} (
                    {m.role === "INTERNAL_MANAGER" ? "Internal" : "External"})
                  </span>
                ))}
              </dd>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
            Created on {new Date(org.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <ContactList organizationId={params.id} />
    </div>
  );
}
