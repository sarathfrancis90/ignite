"use client";

import { useState, useCallback } from "react";
import type { FormEvent } from "react";

interface SplitEntry {
  title: string;
  description: string;
}

interface SplitIdeaDialogProps {
  ideaId: string;
  ideaTitle: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    ideaId: string;
    splits: SplitEntry[];
    archiveOriginal: boolean;
  }) => void;
  isLoading?: boolean;
}

export function SplitIdeaDialog({
  ideaId,
  ideaTitle,
  open,
  onClose,
  onSubmit,
  isLoading = false,
}: SplitIdeaDialogProps) {
  const [splits, setSplits] = useState<SplitEntry[]>([
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [archiveOriginal, setArchiveOriginal] = useState(true);

  const addSplit = useCallback(() => {
    setSplits((prev) => [...prev, { title: "", description: "" }]);
  }, []);

  const removeSplit = useCallback((index: number) => {
    setSplits((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateSplit = useCallback(
    (index: number, field: keyof SplitEntry, value: string) => {
      setSplits((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validSplits = splits.filter((s) => s.title.trim().length > 0);
    if (validSplits.length < 2) return;

    onSubmit({
      ideaId,
      splits: validSplits,
      archiveOriginal,
    });
  };

  const isValid = splits.filter((s) => s.title.trim().length > 0).length >= 2;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 id="split-dialog-title" className="text-lg font-semibold">
          Split Idea
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Split &quot;{ideaTitle}&quot; into multiple new ideas. Contributors
          and tags will be preserved on all split ideas.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {splits.map((split, index) => (
            <div
              key={index}
              className="rounded border border-gray-200 p-4"
              data-testid={`split-entry-${index}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Idea {index + 1}</span>
                {splits.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeSplit(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                    aria-label={`Remove split idea ${index + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Title (required)"
                value={split.title}
                onChange={(e) => updateSplit(index, "title", e.target.value)}
                className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                required
                maxLength={200}
                aria-label={`Split idea ${index + 1} title`}
              />
              <textarea
                placeholder="Description (optional)"
                value={split.description}
                onChange={(e) =>
                  updateSplit(index, "description", e.target.value)
                }
                className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                aria-label={`Split idea ${index + 1} description`}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addSplit}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add another split
          </button>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="archive-original"
              checked={archiveOriginal}
              onChange={(e) => setArchiveOriginal(e.target.checked)}
            />
            <label htmlFor="archive-original" className="text-sm">
              Archive original idea after splitting
            </label>
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
              disabled={!isValid || isLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Splitting..." : "Split Idea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
