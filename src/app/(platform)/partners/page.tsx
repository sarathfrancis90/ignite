"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { trpc } from "@/lib/trpc";

type RelationshipFilter =
  | "IDENTIFIED"
  | "VERIFIED"
  | "QUALIFIED"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED"
  | undefined;

const STATUS_FILTERS: { label: string; value: RelationshipFilter }[] = [
  { label: "All", value: undefined },
  { label: "Identified", value: "IDENTIFIED" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Evaluation", value: "EVALUATION" },
  { label: "Pilot", value: "PILOT" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Archived", value: "ARCHIVED" },
];

export default function PartnersPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<RelationshipFilter>(undefined);

  const organizationsQuery = trpc.organization.list.useQuery({
    limit: 20,
    search: search || undefined,
    relationshipStatus: statusFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage partner organizations, contacts, and relationships.
          </p>
        </div>
        <Link href="/partners/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {organizationsQuery.isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {organizationsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load organizations. Please try again.</p>
        </div>
      )}

      {organizationsQuery.data && organizationsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No organizations found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search || statusFilter
              ? "Try adjusting your filters."
              : "Get started by adding your first partner organization."}
          </p>
          {!search && !statusFilter && (
            <Link href="/partners/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </Link>
          )}
        </div>
      )}

      {organizationsQuery.data && organizationsQuery.data.items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {organizationsQuery.data.items.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}
