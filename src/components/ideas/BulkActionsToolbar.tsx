"use client";

interface BucketOption {
  id: string;
  name: string;
  color: string;
}

interface BulkActionsToolbarProps {
  selectedCount: number;
  buckets: BucketOption[];
  onMerge: () => void;
  onArchive: () => void;
  onAssignBucket: (bucketId: string) => void;
  onExport: (format: "json" | "csv") => void;
  onClearSelection: () => void;
  isLoading?: boolean;
  canMerge?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  buckets,
  onMerge,
  onArchive,
  onAssignBucket,
  onExport,
  onClearSelection,
  isLoading = false,
  canMerge = true,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
      data-testid="bulk-actions-toolbar"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="text-sm font-medium text-blue-900">
        {selectedCount} idea{selectedCount !== 1 ? "s" : ""} selected
      </span>

      <div className="h-4 w-px bg-blue-300" aria-hidden="true" />

      {canMerge && selectedCount >= 2 && (
        <button
          onClick={onMerge}
          disabled={isLoading}
          className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          title="Merge selected ideas into one"
        >
          Merge
        </button>
      )}

      <div className="relative">
        <select
          onChange={(e) => {
            if (e.target.value) {
              onAssignBucket(e.target.value);
              e.target.value = "";
            }
          }}
          disabled={isLoading}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs"
          defaultValue=""
          aria-label="Assign to bucket"
        >
          <option value="" disabled>
            Assign to bucket...
          </option>
          {buckets.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onArchive}
        disabled={isLoading}
        className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        title="Archive selected ideas"
      >
        Archive
      </button>

      <div className="relative">
        <select
          onChange={(e) => {
            if (e.target.value) {
              onExport(e.target.value as "json" | "csv");
              e.target.value = "";
            }
          }}
          disabled={isLoading}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs"
          defaultValue=""
          aria-label="Export selected"
        >
          <option value="" disabled>
            Export...
          </option>
          <option value="json">Export as JSON</option>
          <option value="csv">Export as CSV</option>
        </select>
      </div>

      <div className="ml-auto">
        <button
          onClick={onClearSelection}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
