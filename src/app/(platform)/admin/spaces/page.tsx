"use client";

import * as React from "react";
import { Globe, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { SpaceList } from "@/components/admin/SpaceList";
import type { SpaceItem } from "@/components/admin/SpaceList";
import { SpaceDetailPanel } from "@/components/admin/SpaceDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export default function AdminSpacesPage() {
  const [search, setSearch] = React.useState("");
  const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingSpace, setEditingSpace] = React.useState<{
    id: string;
    name: string;
    description: string | null;
    slug: string;
  } | null>(null);

  const [createForm, setCreateForm] = React.useState({
    name: "",
    description: "",
    slug: "",
  });

  const [editForm, setEditForm] = React.useState({
    name: "",
    description: "",
    slug: "",
  });

  const featureQuery = trpc.space.isEnabled.useQuery();
  const utils = trpc.useUtils();

  const spacesQuery = trpc.space.list.useQuery(
    { limit: 20, search: search || undefined },
    { enabled: featureQuery.data?.enabled === true },
  );

  const detailQuery = trpc.space.getById.useQuery(
    { id: selectedSpaceId! },
    { enabled: !!selectedSpaceId && featureQuery.data?.enabled === true },
  );

  const createMutation = trpc.space.create.useMutation({
    onSuccess: () => {
      void utils.space.list.invalidate();
      setCreateDialogOpen(false);
    },
  });

  const updateMutation = trpc.space.update.useMutation({
    onSuccess: () => {
      void utils.space.list.invalidate();
      if (selectedSpaceId) void utils.space.getById.invalidate({ id: selectedSpaceId });
      setEditDialogOpen(false);
    },
  });

  const archiveMutation = trpc.space.archive.useMutation({
    onSuccess: () => {
      void utils.space.list.invalidate();
      if (selectedSpaceId) void utils.space.getById.invalidate({ id: selectedSpaceId });
    },
  });

  const activateMutation = trpc.space.activate.useMutation({
    onSuccess: () => {
      void utils.space.list.invalidate();
      if (selectedSpaceId) void utils.space.getById.invalidate({ id: selectedSpaceId });
    },
  });

  const removeMemberMutation = trpc.space.removeMember.useMutation({
    onSuccess: () => {
      if (selectedSpaceId) void utils.space.getById.invalidate({ id: selectedSpaceId });
      void utils.space.list.invalidate();
    },
  });

  const changeMemberRoleMutation = trpc.space.changeMemberRole.useMutation({
    onSuccess: () => {
      if (selectedSpaceId) void utils.space.getById.invalidate({ id: selectedSpaceId });
    },
  });

  if (featureQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!featureQuery.data?.enabled) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
        <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
        <h2 className="font-display text-lg font-bold text-gray-900">Feature Not Enabled</h2>
        <p className="mt-2 max-w-md text-center text-sm text-gray-500">
          Innovation Spaces (multi-tenancy) is an Enterprise Edition feature. Set{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
            FEATURE_INNOVATION_SPACES=true
          </code>{" "}
          to enable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Globe className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Innovation Spaces</h1>
          <p className="text-sm text-gray-500">
            Manage logical multi-tenancy spaces with isolated campaigns, users, and data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <SpaceList
            spaces={spacesQuery.data?.items ?? []}
            nextCursor={spacesQuery.data?.nextCursor}
            isLoading={spacesQuery.isLoading}
            search={search}
            onSearchChange={setSearch}
            selectedSpaceId={selectedSpaceId}
            onSelectSpace={setSelectedSpaceId}
            onLoadMore={() => {
              // Cursor-based pagination would need infinite query; keep simple for now
            }}
            onCreateSpace={() => {
              setCreateForm({ name: "", description: "", slug: "" });
              setCreateDialogOpen(true);
            }}
            onEditSpace={(space: SpaceItem) => {
              setEditingSpace({
                id: space.id,
                name: space.name,
                description: space.description,
                slug: space.slug,
              });
              setEditForm({
                name: space.name,
                description: space.description ?? "",
                slug: space.slug,
              });
              setEditDialogOpen(true);
            }}
            onArchiveSpace={(space: SpaceItem) => {
              archiveMutation.mutate({ id: space.id });
            }}
            onActivateSpace={(space: SpaceItem) => {
              activateMutation.mutate({ id: space.id });
            }}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {selectedSpaceId && detailQuery.data ? (
            <SpaceDetailPanel
              space={detailQuery.data}
              isLoading={detailQuery.isLoading}
              onAddMember={() => {
                // Add member dialog would be a future enhancement
              }}
              onRemoveMember={(userId: string) => {
                removeMemberMutation.mutate({ spaceId: selectedSpaceId, userId });
              }}
              onChangeMemberRole={(
                userId: string,
                role: "SPACE_ADMIN" | "SPACE_MANAGER" | "SPACE_MEMBER",
              ) => {
                changeMemberRoleMutation.mutate({ spaceId: selectedSpaceId, userId, role });
              }}
            />
          ) : selectedSpaceId && detailQuery.isLoading ? (
            <SpaceDetailPanel
              space={{
                id: selectedSpaceId,
                name: "",
                description: null,
                slug: "",
                logoUrl: null,
                status: "ACTIVE",
                memberCount: 0,
                members: [],
              }}
              isLoading={true}
              onAddMember={() => {}}
              onRemoveMember={() => {}}
              onChangeMemberRole={() => {}}
            />
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-gray-400">
              <Globe className="mb-3 h-12 w-12" />
              <p className="text-sm font-medium">Select a space</p>
              <p className="mt-1 text-xs">Choose a space from the list to view its members</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent onClose={() => setCreateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create Innovation Space</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="space-name">Name</Label>
              <Input
                id="space-name"
                placeholder="Space name"
                value={createForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateForm((f) => ({
                    ...f,
                    name,
                    slug: f.slug === generateSlug(f.name) ? generateSlug(name) : f.slug,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/spaces/</span>
                <Input
                  id="space-slug"
                  placeholder="my-space"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <p className="text-xs text-gray-400">Lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-description">Description</Label>
              <Textarea
                id="space-description"
                placeholder="Optional description..."
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createMutation.mutate({
                  name: createForm.name,
                  slug: createForm.slug,
                  description: createForm.description || undefined,
                });
              }}
              disabled={!createForm.name || !createForm.slug || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Create Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClose={() => setEditDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Innovation Space</DialogTitle>
          </DialogHeader>
          {editingSpace && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-space-name">Name</Label>
                <Input
                  id="edit-space-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-space-slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">/spaces/</span>
                  <Input
                    id="edit-space-slug"
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-space-description">Description</Label>
                <Textarea
                  id="edit-space-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editingSpace) return;
                updateMutation.mutate({
                  id: editingSpace.id,
                  name: editForm.name || undefined,
                  slug: editForm.slug || undefined,
                  description: editForm.description || undefined,
                });
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
