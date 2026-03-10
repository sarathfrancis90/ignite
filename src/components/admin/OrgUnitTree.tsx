"use client";

import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { OrgUnitTreeNode } from "@/server/services/org-unit.service";

interface OrgUnitTreeProps {
  nodes: OrgUnitTreeNode[];
  selectedId: string | null;
  onSelect: (node: OrgUnitTreeNode) => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (node: OrgUnitTreeNode) => void;
  onDelete: (node: OrgUnitTreeNode) => void;
}

export function OrgUnitTree({
  nodes,
  selectedId,
  onSelect,
  onCreateChild,
  onEdit,
  onDelete,
}: OrgUnitTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FolderTree className="mb-3 h-12 w-12" />
        <p className="text-sm font-medium">No organizational units yet</p>
        <p className="mt-1 text-xs">Create your first org unit to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreateChild={onCreateChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: OrgUnitTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: OrgUnitTreeNode) => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (node: OrgUnitTreeNode) => void;
  onDelete: (node: OrgUnitTreeNode) => void;
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onCreateChild,
  onEdit,
  onDelete,
}: TreeNodeProps) {
  const [expanded, setExpanded] = React.useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  const canDelete = node.childCount === 0 && node.userCount === 0;

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 transition-colors",
          isSelected ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50",
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded transition-colors",
            hasChildren ? "hover:bg-gray-200" : "invisible",
          )}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasChildren &&
            (expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            ))}
        </button>

        <button onClick={() => onSelect(node)} className="flex min-w-0 flex-1 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate text-sm font-medium">{node.name}</span>
          {node.userCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Users className="h-3 w-3" />
              {node.userCount}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-0.5 group-hover:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(node.id);
            }}
            title="Add child unit"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            disabled={!canDelete}
            title={canDelete ? "Delete" : "Cannot delete: has children or assigned users"}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
