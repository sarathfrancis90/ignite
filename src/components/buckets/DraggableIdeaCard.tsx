"use client";

import { useDraggable } from "@dnd-kit/core";

interface DraggableIdeaCardProps {
  ideaId: string;
  title: string;
  status: string;
  bucketColor?: string;
}

export function DraggableIdeaCard({
  ideaId,
  title,
  status,
  bucketColor,
}: DraggableIdeaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `idea-${ideaId}`,
      data: { ideaId },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm ${
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"
      } cursor-grab active:cursor-grabbing`}
      data-testid={`draggable-idea-${ideaId}`}
    >
      <div className="flex items-center gap-2">
        {bucketColor && (
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: bucketColor }}
          />
        )}
        <span className="flex-1 truncate font-medium text-gray-800">
          {title}
        </span>
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
          {status.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}
