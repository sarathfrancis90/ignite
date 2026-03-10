"use client";

import Link from "next/link";
import { Building2, MapPin, Globe, Users, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelationshipBadge, NdaBadge } from "./OrganizationStatusBadge";

interface OrganizationCardProps {
  organization: {
    id: string;
    name: string;
    description: string | null;
    industry: string | null;
    location: string | null;
    websiteUrl: string | null;
    relationshipStatus:
      | "IDENTIFIED"
      | "VERIFIED"
      | "QUALIFIED"
      | "EVALUATION"
      | "PILOT"
      | "PARTNERSHIP"
      | "ARCHIVED";
    ndaStatus: "NONE" | "REQUESTED" | "SIGNED" | "EXPIRED";
    isConfidential: boolean;
    contactCount: number;
    createdAt: string;
  };
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Link href={`/partners/${organization.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Building2 className="h-5 w-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {organization.name}
                  {organization.isConfidential && (
                    <Lock className="ml-1.5 inline h-3.5 w-3.5 text-gray-400" />
                  )}
                </CardTitle>
                {organization.industry && (
                  <p className="mt-0.5 text-xs text-gray-500">{organization.industry}</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {organization.description && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-600">{organization.description}</p>
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            <RelationshipBadge status={organization.relationshipStatus} />
            {organization.ndaStatus !== "NONE" && <NdaBadge status={organization.ndaStatus} />}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {organization.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {organization.location}
              </span>
            )}
            {organization.websiteUrl && (
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Website
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {organization.contactCount} contact{organization.contactCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
