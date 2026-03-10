"use client";

import * as React from "react";
import { Building2, Plus, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { OrgUnitTree } from "@/components/admin/OrgUnitTree";
import { trpc } from "@/lib/trpc";
import type { OrgUnitTreeNode } from "@/server/services/org-unit.service";

type FormMode = "create" | "edit";

interface OrgUnitFormData {
  name: string;
  description: string;
  parentId: string | null;
}

export default function OrgUnitsPage() {
  const [selectedNode, setSelectedNode] = React.useState<OrgUnitTreeNode | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<FormMode>("create");
  const [formData, setFormData] = React.useState<OrgUnitFormData>({
    name: "",
    description: "",
    parentId: null,
  });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingNode, setDeletingNode] = React.useState<OrgUnitTreeNode | null>(null);

  const utils = trpc.useUtils();

  const treeQuery = trpc.admin.orgUnitTree.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const detailQuery = trpc.admin.orgUnitGetById.useQuery(
    { id: selectedNode?.id ?? "" },
    { enabled: !!selectedNode },
  );

  const createMutation = trpc.admin.orgUnitCreate.useMutation({
    onSuccess: () => {
      void utils.admin.orgUnitTree.invalidate();
      setFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = trpc.admin.orgUnitUpdate.useMutation({
    onSuccess: () => {
      void utils.admin.orgUnitTree.invalidate();
      if (selectedNode) {
        void utils.admin.orgUnitGetById.invalidate({ id: selectedNode.id });
      }
      setFormOpen(false);
      resetForm();
    },
  });

  const deleteMutation = trpc.admin.orgUnitDelete.useMutation({
    onSuccess: () => {
      void utils.admin.orgUnitTree.invalidate();
      setSelectedNode(null);
      setDeleteConfirmOpen(false);
      setDeletingNode(null);
    },
  });

  const removeUserMutation = trpc.admin.orgUnitRemoveUser.useMutation({
    onSuccess: () => {
      if (selectedNode) {
        void utils.admin.orgUnitGetById.invalidate({ id: selectedNode.id });
        void utils.admin.orgUnitTree.invalidate();
      }
    },
  });

  function resetForm() {
    setFormData({ name: "", description: "", parentId: null });
    setEditingId(null);
  }

  function handleCreateRoot() {
    setFormMode("create");
    resetForm();
    setFormOpen(true);
  }

  function handleCreateChild(parentId: string) {
    setFormMode("create");
    setFormData({ name: "", description: "", parentId });
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(node: OrgUnitTreeNode) {
    setFormMode("edit");
    setFormData({
      name: node.name,
      description: node.description ?? "",
      parentId: node.parentId,
    });
    setEditingId(node.id);
    setFormOpen(true);
  }

  function handleDelete(node: OrgUnitTreeNode) {
    setDeletingNode(node);
    setDeleteConfirmOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formMode === "create") {
      createMutation.mutate({
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId,
      });
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        description: formData.description || null,
      });
    }
  }

  function handleConfirmDelete() {
    if (deletingNode) {
      deleteMutation.mutate({ id: deletingNode.id });
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Organizational Units</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define your organizational hierarchy for audience targeting and access scoping.
          </p>
        </div>
        <Button onClick={handleCreateRoot}>
          <Plus className="mr-2 h-4 w-4" />
          New Root Unit
        </Button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tree Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Organization Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treeQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : treeQuery.isError ? (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                Failed to load org units. Please try again.
              </div>
            ) : (
              <OrgUnitTree
                nodes={treeQuery.data ?? []}
                selectedId={selectedNode?.id ?? null}
                onSelect={setSelectedNode}
                onCreateChild={handleCreateChild}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Unit Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              detailQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : detailQuery.data ? (
                <OrgUnitDetail
                  detail={detailQuery.data}
                  onRemoveUser={(userId) =>
                    removeUserMutation.mutate({
                      orgUnitId: selectedNode.id,
                      userId,
                    })
                  }
                  isRemoving={removeUserMutation.isPending}
                />
              ) : null
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">
                Select an org unit to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent onClose={() => setFormOpen(false)}>
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Create Org Unit" : "Edit Org Unit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engineering Division"
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                maxLength={500}
              />
            </div>
            {formData.parentId && formMode === "create" && (
              <p className="text-xs text-gray-500">
                This unit will be created as a child of the selected parent.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating || !formData.name.trim()}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {formMode === "create" ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent onClose={() => setDeleteConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Org Unit</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{deletingNode?.name}</span>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail Sub-Component ──────────────────────────────────

interface OrgUnitDetailData {
  id: string;
  name: string;
  description: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; isActive: boolean }[];
  users: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    assignedAt: Date | string;
  }[];
  userCount: number;
  childCount: number;
}

interface OrgUnitDetailProps {
  detail: OrgUnitDetailData;
  onRemoveUser: (userId: string) => void;
  isRemoving: boolean;
}

function OrgUnitDetail({ detail, onRemoveUser, isRemoving }: OrgUnitDetailProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-900">{detail.name}</h3>
        {detail.description && <p className="mt-1 text-sm text-gray-500">{detail.description}</p>}
      </div>

      {detail.parent && (
        <div className="text-xs text-gray-500">
          Parent: <span className="font-medium">{detail.parent.name}</span>
        </div>
      )}

      {detail.children.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            Child Units ({detail.childCount})
          </h4>
          <div className="space-y-1">
            {detail.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-sm"
              >
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                {child.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          Assigned Users ({detail.userCount})
        </h4>
        {detail.users.length > 0 ? (
          <div className="space-y-1">
            {detail.users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">
                    {user.name ?? user.email}
                  </p>
                  {user.name && <p className="truncate text-xs text-gray-400">{user.email}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onRemoveUser(user.id)}
                  disabled={isRemoving}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No users assigned</p>
        )}
      </div>
    </div>
  );
}
