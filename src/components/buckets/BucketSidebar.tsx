"use client";

import { useState } from "react";
import { useBucketStore } from "@/stores/bucket.store";
import { BUCKET_COLORS } from "@/types/bucket";
import type { SmartFilter } from "@/types/bucket";

// ============================================================
// Types for bucket data (matches service response shape)
// ============================================================

export interface BucketData {
  id: string;
  name: string;
  color: string | null;
  isSmart: boolean;
  smartFilter: SmartFilter | null;
  ideaCount: number;
  campaignId: string | null;
}

interface BucketSidebarProps {
  buckets: BucketData[];
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
}

export function BucketSidebar({
  buckets,
  totalIdeaCount,
  onCreateBucket,
  onDeleteBucket,
  onEditBucket,
}: BucketSidebarProps) {
  const { activeBucketId, setActiveBucket } = useBucketStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(BUCKET_COLORS[0]);
  const [contextMenuBucketId, setContextMenuBucketId] = useState<string | null>(
    null,
  );

  const unassignedCount =
    totalIdeaCount - buckets.reduce((sum, b) => sum + b.ideaCount, 0);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newBucketName.trim()) return;

    onCreateBucket({
      name: newBucketName.trim(),
      color: selectedColor,
      isSmart: false,
    });
    setNewBucketName("");
    setSelectedColor(BUCKET_COLORS[0]);
    setShowCreateForm(false);
  }

  return (
    <aside
      className="flex h-full w-60 flex-col border-r border-gray-200 bg-gray-50"
      data-testid="bucket-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <h2 className="text-sm font-semibold text-gray-700">Buckets</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          aria-label="Create bucket"
          data-testid="create-bucket-btn"
        >
          <PlusIcon />
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="border-b border-gray-200 p-3"
          data-testid="create-bucket-form"
        >
          <input
            type="text"
            value={newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            placeholder="Bucket name..."
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            autoFocus
            maxLength={50}
            data-testid="bucket-name-input"
          />
          <div className="mb-2 flex flex-wrap gap-1">
            {BUCKET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`h-5 w-5 rounded-full border-2 ${
                  selectedColor === color
                    ? "border-gray-800"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                data-testid={`color-${color}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
              data-testid="submit-bucket-btn"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Bucket list */}
      <nav className="flex-1 overflow-y-auto p-2" role="list">
        {/* All Ideas */}
        <BucketItem
          label="All Ideas"
          count={totalIdeaCount}
          isActive={activeBucketId === null}
          onClick={() => setActiveBucket(null)}
        />

        {/* Unassigned */}
        <BucketItem
          label="Unassigned"
          count={unassignedCount}
          color="#94A3B8"
          isActive={activeBucketId === "unassigned"}
          onClick={() => setActiveBucket("unassigned")}
        />

        {/* Manual buckets */}
        {buckets
          .filter((b) => !b.isSmart)
          .map((bucket) => (
            <BucketItem
              key={bucket.id}
              label={bucket.name}
              count={bucket.ideaCount}
              color={bucket.color ?? "#6366F1"}
              isActive={activeBucketId === bucket.id}
              onClick={() => setActiveBucket(bucket.id)}
              onContextMenu={() =>
                setContextMenuBucketId(
                  contextMenuBucketId === bucket.id ? null : bucket.id,
                )
              }
              contextMenu={
                contextMenuBucketId === bucket.id ? (
                  <BucketContextMenu
                    onEdit={() => {
                      onEditBucket({ bucketId: bucket.id });
                      setContextMenuBucketId(null);
                    }}
                    onDelete={() => {
                      onDeleteBucket(bucket.id);
                      setContextMenuBucketId(null);
                    }}
                    onClose={() => setContextMenuBucketId(null)}
                  />
                ) : null
              }
            />
          ))}

        {/* Smart buckets section */}
        {buckets.some((b) => b.isSmart) && (
          <>
            <div className="mt-3 mb-1 px-2 text-xs font-medium text-gray-400 uppercase">
              Smart Buckets
            </div>
            {buckets
              .filter((b) => b.isSmart)
              .map((bucket) => (
                <BucketItem
                  key={bucket.id}
                  label={bucket.name}
                  count={bucket.ideaCount}
                  color={bucket.color ?? "#6366F1"}
                  isSmart
                  isActive={activeBucketId === bucket.id}
                  onClick={() => setActiveBucket(bucket.id)}
                  onContextMenu={() =>
                    setContextMenuBucketId(
                      contextMenuBucketId === bucket.id ? null : bucket.id,
                    )
                  }
                  contextMenu={
                    contextMenuBucketId === bucket.id ? (
                      <BucketContextMenu
                        onEdit={() => {
                          onEditBucket({ bucketId: bucket.id });
                          setContextMenuBucketId(null);
                        }}
                        onDelete={() => {
                          onDeleteBucket(bucket.id);
                          setContextMenuBucketId(null);
                        }}
                        onClose={() => setContextMenuBucketId(null)}
                      />
                    ) : null
                  }
                />
              ))}
          </>
        )}
      </nav>
    </aside>
  );
}

// ============================================================
// Sub-components
// ============================================================

function BucketItem({
  label,
  count,
  color,
  isSmart,
  isActive,
  onClick,
  onContextMenu,
  contextMenu,
}: {
  label: string;
  count: number;
  color?: string;
  isSmart?: boolean;
  isActive: boolean;
  onClick: () => void;
  onContextMenu?: () => void;
  contextMenu?: React.ReactNode;
}) {
  return (
    <div className="relative" role="listitem">
      <button
        onClick={onClick}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu();
          }
        }}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
          isActive
            ? "bg-indigo-50 text-indigo-700 font-medium"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        data-testid={`bucket-item-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {color && (
          <span
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        {isSmart && <SmartIcon />}
        <span className="flex-1 truncate text-left">{label}</span>
        <span className="text-xs text-gray-400">{count}</span>
      </button>
      {contextMenu}
    </div>
  );
}

function BucketContextMenu({
  onEdit,
  onDelete,
  onClose,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="absolute left-full top-0 z-20 ml-1 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        data-testid="bucket-context-menu"
      >
        <button
          onClick={onEdit}
          className="flex w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </>
  );
}

// ============================================================
// Icons
// ============================================================

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SmartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 text-amber-500"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
