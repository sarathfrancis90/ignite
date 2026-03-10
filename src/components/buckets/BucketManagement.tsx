"use client";

import { useState, useCallback } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useBucketStore } from "@/stores/bucket.store";
import { BucketSidebar, type BucketData } from "./BucketSidebar";
import { SmartBucketForm } from "./SmartBucketForm";
import { BucketAssignMenu } from "./BucketAssignMenu";
import { BucketDropZone } from "./BucketDropZone";
import { DraggableIdeaCard } from "./DraggableIdeaCard";
import type { SmartFilter } from "@/types/bucket";

// ============================================================
// Types
// ============================================================

interface IdeaData {
  id: string;
  title: string;
  status: string;
  bucketAssignments: Array<{
    bucketId: string;
    bucket: { color: string | null };
  }>;
}

interface BucketManagementProps {
  buckets: BucketData[];
  ideas: IdeaData[];
  totalIdeaCount: number;
  onCreateBucket: (data: {
    name: string;
    color: string;
    isSmart: boolean;
    filter?: SmartFilter;
  }) => void;
  onDeleteBucket: (bucketId: string) => void;
  onEditBucket: (data: {
    bucketId: string;
    name?: string;
    color?: string;
  }) => void;
  onAssignIdea: (ideaId: string, bucketId: string) => void;
  onRemoveIdea: (ideaId: string, bucketId: string) => void;
  onCreateSmartBucket: (data: {
    name: string;
    color: string;
    filter: SmartFilter;
  }) => void;
}

export function BucketManagement({
  buckets,
  ideas,
  totalIdeaCount,
  onCreateBucket,
  onDeleteBucket,
  onEditBucket,
  onAssignIdea,
  onRemoveIdea,
  onCreateSmartBucket,
}: BucketManagementProps) {
  const { activeBucketId, isSmartMode, setSmartMode } = useBucketStore();
  const [assignMenuIdeaId, setAssignMenuIdeaId] = useState<string | null>(null);

  // Filter ideas by active bucket
  const filteredIdeas = getFilteredIdeas(ideas, activeBucketId);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const ideaId = (active.data.current as { ideaId: string })?.ideaId;
      const bucketId = (over.data.current as { bucketId: string })?.bucketId;

      if (ideaId && bucketId) {
        onAssignIdea(ideaId, bucketId);
      }
    },
    [onAssignIdea],
  );

  return (
    <div className="flex h-full" data-testid="bucket-management">
      {/* Sidebar */}
      <BucketSidebar
        buckets={buckets}
        totalIdeaCount={totalIdeaCount}
        onCreateBucket={onCreateBucket}
        onDeleteBucket={onDeleteBucket}
        onEditBucket={onEditBucket}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Smart bucket creation mode */}
        {isSmartMode ? (
          <div className="mx-auto max-w-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Create Smart Bucket
            </h2>
            <SmartBucketForm
              onSubmit={(data) => {
                onCreateSmartBucket(data);
                setSmartMode(false);
              }}
              onCancel={() => setSmartMode(false)}
            />
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {activeBucketId === null
                  ? "All Ideas"
                  : activeBucketId === "unassigned"
                    ? "Unassigned Ideas"
                    : (buckets.find((b) => b.id === activeBucketId)?.name ??
                      "Bucket")}
              </h2>
              <button
                onClick={() => setSmartMode(true)}
                className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100"
                data-testid="create-smart-bucket-btn"
              >
                + Smart Bucket
              </button>
            </div>

            {/* Drag-and-drop idea list */}
            <DndContext onDragEnd={handleDragEnd}>
              <div className="space-y-2">
                {filteredIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="relative flex items-center gap-2"
                  >
                    <DraggableIdeaCard
                      ideaId={idea.id}
                      title={idea.title}
                      status={idea.status}
                      bucketColor={
                        idea.bucketAssignments[0]?.bucket.color ?? undefined
                      }
                    />
                    <div className="relative">
                      <button
                        onClick={() =>
                          setAssignMenuIdeaId(
                            assignMenuIdeaId === idea.id ? null : idea.id,
                          )
                        }
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Assign to bucket"
                        data-testid={`assign-menu-trigger-${idea.id}`}
                      >
                        <FolderIcon />
                      </button>
                      {assignMenuIdeaId === idea.id && (
                        <BucketAssignMenu
                          buckets={buckets}
                          currentBucketIds={idea.bucketAssignments.map(
                            (a) => a.bucketId,
                          )}
                          onAssign={(bucketId) =>
                            onAssignIdea(idea.id, bucketId)
                          }
                          onRemove={(bucketId) =>
                            onRemoveIdea(idea.id, bucketId)
                          }
                          onClose={() => setAssignMenuIdeaId(null)}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {filteredIdeas.length === 0 && (
                  <div className="py-12 text-center text-gray-400">
                    No ideas in this bucket
                  </div>
                )}
              </div>

              {/* Drop zones for buckets (visible during drag) */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {buckets
                  .filter((b) => !b.isSmart)
                  .map((bucket) => (
                    <BucketDropZone
                      key={bucket.id}
                      bucketId={bucket.id}
                      bucketName={bucket.name}
                      bucketColor={bucket.color ?? "#6366F1"}
                      isActive={activeBucketId === bucket.id}
                    />
                  ))}
              </div>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function getFilteredIdeas(
  ideas: IdeaData[],
  activeBucketId: string | null,
): IdeaData[] {
  if (activeBucketId === null) return ideas;

  if (activeBucketId === "unassigned") {
    return ideas.filter((idea) => idea.bucketAssignments.length === 0);
  }

  return ideas.filter((idea) =>
    idea.bucketAssignments.some((a) => a.bucketId === activeBucketId),
  );
}

function FolderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
