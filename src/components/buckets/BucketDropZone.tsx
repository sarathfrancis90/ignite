"use client";

import { useDroppable } from "@dnd-kit/core";

interface BucketDropZoneProps {
  bucketId: string;
  bucketName: string;
  bucketColor: string;
  isActive: boolean;
  children?: React.ReactNode;
}

export function BucketDropZone({
  bucketId,
  bucketName,
  bucketColor,
  isActive,
  children,
}: BucketDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `bucket-drop-${bucketId}`,
    data: { bucketId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver
          ? "border-indigo-400 bg-indigo-50"
          : isActive
            ? "border-gray-300 bg-gray-50"
            : "border-transparent"
      }`}
      data-testid={`bucket-drop-${bucketId}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: bucketColor }}
        />
        <span className="text-sm font-medium text-gray-700">{bucketName}</span>
      </div>
      {children}
    </div>
  );
}
