"use client";

import type { BucketData } from "./BucketSidebar";

interface BucketAssignMenuProps {
  buckets: BucketData[];
  currentBucketIds: string[];
  onAssign: (bucketId: string) => void;
  onRemove: (bucketId: string) => void;
  onClose: () => void;
}

export function BucketAssignMenu({
  buckets,
  currentBucketIds,
  onAssign,
  onRemove,
  onClose,
}: BucketAssignMenuProps) {
  const manualBuckets = buckets.filter((b) => !b.isSmart);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute right-0 top-full z-40 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        data-testid="bucket-assign-menu"
      >
        <div className="border-b border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">
          Assign to bucket
        </div>
        {manualBuckets.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">No buckets yet</div>
        )}
        {manualBuckets.map((bucket) => {
          const isAssigned = currentBucketIds.includes(bucket.id);
          return (
            <button
              key={bucket.id}
              onClick={() => {
                if (isAssigned) {
                  onRemove(bucket.id);
                } else {
                  onAssign(bucket.id);
                }
                onClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              data-testid={`assign-bucket-${bucket.id}`}
            >
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: bucket.color ?? "#6366F1" }}
              />
              <span className="flex-1 truncate text-left">{bucket.name}</span>
              {isAssigned && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-indigo-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
