"use client";

import { useState } from "react";
import type { FormEvent } from "react";

interface IdeaSummary {
  id: string;
  title: string;
  status: string;
  contributorName: string;
}

interface MergeIdeasDialogProps {
  ideas: IdeaSummary[];
  campaignId: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    ideaIds: string[];
    campaignId: string;
    title?: string;
    description?: string;
  }) => void;
  isLoading?: boolean;
}

export function MergeIdeasDialog({
  ideas,
  campaignId,
  open,
  onClose,
  onSubmit,
  isLoading = false,
}: MergeIdeasDialogProps) {
  const [title, setTitle] = useState(ideas.map((i) => i.title).join(" + "));
  const [description, setDescription] = useState("");
  const [useCustomDescription, setUseCustomDescription] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (ideas.length < 2) return;

    onSubmit({
      ideaIds: ideas.map((i) => i.id),
      campaignId,
      title: title.trim() || undefined,
      description:
        useCustomDescription && description.trim()
          ? description.trim()
          : undefined,
    });
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 id="merge-dialog-title" className="text-lg font-semibold">
          Merge Ideas
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Merge {ideas.length} ideas into one. All comments, votes,
          contributors, and tags will be preserved. Source ideas will be
          archived.
        </p>

        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium">Ideas to merge:</h3>
          <ul className="space-y-1" data-testid="merge-ideas-list">
            {ideas.map((idea) => (
              <li
                key={idea.id}
                className="flex items-center gap-2 rounded bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{idea.title}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{idea.status}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{idea.contributorName}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="merge-title" className="block text-sm font-medium">
              Merged Idea Title
            </label>
            <input
              id="merge-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              maxLength={200}
              placeholder="Title for the merged idea"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom-description"
              checked={useCustomDescription}
              onChange={(e) => setUseCustomDescription(e.target.checked)}
            />
            <label htmlFor="custom-description" className="text-sm">
              Provide custom description (otherwise descriptions will be
              combined)
            </label>
          </div>

          {useCustomDescription && (
            <div>
              <label
                htmlFor="merge-description"
                className="block text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="merge-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={4}
                placeholder="Combined description for the merged idea"
              />
            </div>
          )}

          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            After merging, all {ideas.length} source ideas will be archived.
            This action cannot be undone.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={ideas.length < 2 || isLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Merging..." : `Merge ${ideas.length} Ideas`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
