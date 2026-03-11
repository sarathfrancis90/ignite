"use client";

import Link from "next/link";
import { Briefcase, Building2, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UseCaseStatusBadge, UseCasePriorityBadge } from "./UseCaseStatusBadge";

interface UseCaseCardProps {
  useCase: {
    id: string;
    title: string;
    description: string | null;
    status: "IDENTIFIED" | "QUALIFICATION" | "EVALUATION" | "PILOT" | "PARTNERSHIP" | "ARCHIVED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    organization: { id: string; name: string };
    _count: {
      teamMembers: number;
      tasks: number;
    };
    targetDate: string | null;
    createdAt: string;
  };
  organizationId?: string;
}

export function UseCaseCard({ useCase, organizationId }: UseCaseCardProps) {
  const href = organizationId
    ? `/partners/${organizationId}/usecases/${useCase.id}`
    : `/partners/${useCase.organization.id}/usecases/${useCase.id}`;

  return (
    <Link href={href}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Briefcase className="h-5 w-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{useCase.title}</CardTitle>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="h-3 w-3" />
                  {useCase.organization.name}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {useCase.description && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-600">{useCase.description}</p>
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            <UseCaseStatusBadge status={useCase.status} />
            <UseCasePriorityBadge priority={useCase.priority} />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {useCase._count.teamMembers} member{useCase._count.teamMembers !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {useCase._count.tasks} task{useCase._count.tasks !== 1 ? "s" : ""}
            </span>
            {useCase.targetDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(useCase.targetDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
