"use client";

import Image from "next/image";
import { clsx } from "clsx";
import type { Idea } from "@/types/idea";
import { formatDate } from "@/lib/comparison-utils";
import { StatusBadge } from "./StatusBadge";

interface ComparisonPanelProps {
  idea: Idea;
  position: "left" | "right";
  onClose: () => void;
  onChangeIdea: () => void;
}

export function ComparisonPanel({
  idea,
  position,
  onClose,
  onChangeIdea,
}: ComparisonPanelProps) {
  return (
    <div
      className={clsx(
        "flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white",
        position === "left" ? "border-r-0 lg:border-r" : "",
      )}
      data-testid={`comparison-panel-${position}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tracking-wider text-gray-400 uppercase">
            {position === "left" ? "Idea A" : "Idea B"}
          </span>
          <StatusBadge status={idea.status} />
          {idea.isHot && (
            <span
              className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600"
              data-testid="hot-badge"
            >
              HOT!
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onChangeIdea}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={`Change ${position} idea`}
            data-testid={`change-${position}-idea`}
          >
            Change
          </button>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={`Close ${position} panel`}
            data-testid={`close-${position}-panel`}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Title */}
        <h3
          className="mb-2 text-lg font-semibold text-gray-900"
          data-testid="idea-title"
        >
          {idea.title}
        </h3>

        {/* Author & Date */}
        <div className="mb-4 flex items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            {idea.author.avatarUrl ? (
              <Image
                src={idea.author.avatarUrl}
                alt={idea.author.name}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                {idea.author.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span data-testid="idea-author">{idea.author.name}</span>
          </div>
          <span>·</span>
          <span data-testid="idea-date">{formatDate(idea.createdAt)}</span>
        </div>

        {/* Category */}
        {idea.category && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${idea.category.color}20`,
                color: idea.category.color,
              }}
              data-testid="idea-category"
            >
              {idea.category.name}
            </span>
          </div>
        )}

        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5" data-testid="idea-tags">
            {idea.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h4 className="mb-1.5 text-xs font-medium tracking-wider text-gray-400 uppercase">
            Description
          </h4>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            data-testid="idea-description"
            dangerouslySetInnerHTML={{ __html: idea.description }}
          />
        </div>

        {/* Metrics */}
        <div className="mb-6 rounded-lg bg-gray-50 p-3">
          <h4 className="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
            Metrics
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <MetricItem
              label="Vote Avg"
              value={idea.voteAverage?.toFixed(1) ?? "—"}
              testId="metric-vote-avg"
            />
            <MetricItem
              label="Votes"
              value={String(idea.voteCount)}
              testId="metric-vote-count"
            />
            <MetricItem
              label="Comments"
              value={String(idea.commentCount)}
              testId="metric-comments"
            />
            <MetricItem
              label="Likes"
              value={String(idea.likeCount)}
              testId="metric-likes"
            />
          </div>
        </div>

        {/* Custom Fields */}
        {idea.customFields.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
              Custom Fields
            </h4>
            <div className="space-y-2" data-testid="custom-fields">
              {idea.customFields.map((field) => (
                <div key={field.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">{field.label}</span>
                  <span className="font-medium text-gray-700">
                    {field.type === "CHECKBOX"
                      ? field.value
                        ? "Yes"
                        : "No"
                      : String(field.value ?? "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {idea.attachments.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
              Attachments
            </h4>
            <ul className="space-y-1" data-testid="idea-attachments">
              {idea.attachments.map((att) => (
                <li key={att.id} className="text-sm text-indigo-600">
                  {att.fileName}
                  <span className="ml-1 text-gray-400">
                    ({(att.fileSize / 1024).toFixed(0)} KB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold text-gray-900" data-testid={testId}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
