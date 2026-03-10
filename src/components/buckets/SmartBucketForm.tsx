"use client";

import { useState } from "react";
import { BUCKET_COLORS } from "@/types/bucket";
import type { SmartFilter } from "@/types/bucket";

interface SmartBucketFormProps {
  onSubmit: (data: {
    name: string;
    color: string;
    filter: SmartFilter;
  }) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    color: string;
    filter: SmartFilter;
  };
}

const IDEA_STATUSES = [
  "DRAFT",
  "QUALIFICATION",
  "COMMUNITY_DISCUSSION",
  "HOT",
  "EVALUATION",
  "SELECTED_IMPLEMENTATION",
  "SELECTED_CONCEPT",
  "IMPLEMENTED",
  "ARCHIVED",
];

export function SmartBucketForm({
  onSubmit,
  onCancel,
  initialValues,
}: SmartBucketFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [color, setColor] = useState(initialValues?.color ?? BUCKET_COLORS[4]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialValues?.filter.status ?? [],
  );
  const [minVoteScore, setMinVoteScore] = useState<string>(
    initialValues?.filter.minVoteScore?.toString() ?? "",
  );
  const [minLikeCount, setMinLikeCount] = useState<string>(
    initialValues?.filter.minLikeCount?.toString() ?? "",
  );
  const [minCommentCount, setMinCommentCount] = useState<string>(
    initialValues?.filter.minCommentCount?.toString() ?? "",
  );
  const [isHot, setIsHot] = useState<boolean | undefined>(
    initialValues?.filter.isHot,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const filter: SmartFilter = {};

    if (selectedStatuses.length > 0) {
      filter.status = selectedStatuses;
    }
    if (minVoteScore) {
      filter.minVoteScore = parseFloat(minVoteScore);
    }
    if (minLikeCount) {
      filter.minLikeCount = parseInt(minLikeCount, 10);
    }
    if (minCommentCount) {
      filter.minCommentCount = parseInt(minCommentCount, 10);
    }
    if (isHot !== undefined) {
      filter.isHot = isHot;
    }

    onSubmit({ name: name.trim(), color, filter });
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="smart-bucket-form"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Hot Ideas with 5+ votes"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          maxLength={50}
          data-testid="smart-bucket-name"
        />
      </div>

      {/* Color picker */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {BUCKET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${
                color === c ? "border-gray-800" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Filter criteria */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Filter: Status
        </label>
        <div className="flex flex-wrap gap-1">
          {IDEA_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                selectedStatuses.includes(status)
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600"
              }`}
              data-testid={`status-filter-${status}`}
            >
              {status.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Min Vote Score
          </label>
          <input
            type="number"
            value={minVoteScore}
            onChange={(e) => setMinVoteScore(e.target.value)}
            placeholder="e.g., 3.5"
            step="0.1"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            data-testid="min-vote-score"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Min Likes
          </label>
          <input
            type="number"
            value={minLikeCount}
            onChange={(e) => setMinLikeCount(e.target.value)}
            placeholder="e.g., 5"
            min="0"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            data-testid="min-like-count"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Min Comments
          </label>
          <input
            type="number"
            value={minCommentCount}
            onChange={(e) => setMinCommentCount(e.target.value)}
            placeholder="e.g., 3"
            min="0"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            data-testid="min-comment-count"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            HOT! Status
          </label>
          <select
            value={isHot === undefined ? "" : isHot ? "true" : "false"}
            onChange={(e) => {
              if (e.target.value === "") setIsHot(undefined);
              else setIsHot(e.target.value === "true");
            }}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            data-testid="is-hot-filter"
          >
            <option value="">Any</option>
            <option value="true">HOT only</option>
            <option value="false">Not HOT</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          data-testid="create-smart-bucket-submit"
        >
          {initialValues ? "Update" : "Create"} Smart Bucket
        </button>
      </div>
    </form>
  );
}
