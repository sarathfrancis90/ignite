"use client";

import { cn } from "@/lib/utils";
import type { SuggestedExpert } from "@/server/services/experts.service";

interface SuggestedExpertsProps {
  experts: SuggestedExpert[];
  onAddCoAuthor?: (userId: string) => void;
  onMention?: (userId: string) => void;
  className?: string;
}

function ExpertCard({
  expert,
  onAddCoAuthor,
  onMention,
}: {
  expert: SuggestedExpert;
  onAddCoAuthor?: (userId: string) => void;
  onMention?: (userId: string) => void;
}) {
  const displayName =
    expert.displayName ?? `${expert.firstName} ${expert.lastName}`;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0">
        {expert.avatarUrl ? (
          <img
            src={expert.avatarUrl}
            alt={displayName}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
            {expert.firstName.charAt(0)}
            {expert.lastName.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {displayName}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {expert.matchingSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
            >
              {skill}
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          {onAddCoAuthor && (
            <button
              onClick={() => onAddCoAuthor(expert.id)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              type="button"
            >
              Add as co-author
            </button>
          )}
          {onMention && (
            <button
              onClick={() => onMention(expert.id)}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              type="button"
            >
              @Mention
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SuggestedExperts({
  experts,
  onAddCoAuthor,
  onMention,
  className,
}: SuggestedExpertsProps) {
  if (experts.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border bg-white p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        Suggested Experts
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        These experts have relevant skills. Add them as co-authors or @mention
        them in comments.
      </p>
      <div className="space-y-2">
        {experts.map((expert) => (
          <ExpertCard
            key={expert.id}
            expert={expert}
            onAddCoAuthor={onAddCoAuthor}
            onMention={onMention}
          />
        ))}
      </div>
    </div>
  );
}
