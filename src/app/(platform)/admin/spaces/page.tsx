"use client";

import * as React from "react";
import { Globe, Plus, AlertTriangle } from "lucide-react";
import { SpaceList, SpaceDetailPanel } from "@/components/admin/SpaceManager";
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

  const featureEnabled = process.env.NEXT_PUBLIC_FEATURE_INNOVATION_SPACES === "true";

  if (!featureEnabled) {
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

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
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

      {/* Split layout: space list + detail panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Space list */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <SpaceList
            spaces={[]}
            isLoading={false}
            search={search}
            onSearchChange={setSearch}
            selectedSpaceId={selectedSpaceId}
            onSelectSpace={setSelectedSpaceId}
            onLoadMore={() => {
              // TODO: Wire to cursor-based pagination
            }}
            onCreateSpace={() => {
              setCreateForm({ name: "", description: "", slug: "" });
              setCreateDialogOpen(true);
            }}
            onEditSpace={(space) => {
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
            onArchiveSpace={() => {
              // TODO: Wire to trpc.space.archive.mutate(...)
            }}
            onActivateSpace={() => {
              // TODO: Wire to trpc.space.activate.mutate(...)
            }}
          />
        </div>

        {/* Right: Space detail panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {selectedSpaceId ? (
            <SpaceDetailPanel
              space={{
                id: selectedSpaceId,
                name: "Select a space",
                description: null,
                slug: "",
                logoUrl: null,
                status: "ACTIVE",
                memberCount: 0,
                members: [],
              }}
              isLoading={false}
              onAddMember={() => {
                // TODO: Wire to add member dialog
              }}
              onRemoveMember={() => {
                // TODO: Wire to trpc.space.removeMember.mutate(...)
              }}
              onChangeMemberRole={() => {
                // TODO: Wire to trpc.space.changeMemberRole.mutate(...)
              }}
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

      {/* Create Space Dialog */}
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
                // TODO: Wire to trpc.space.create.mutate(createForm)
                setCreateDialogOpen(false);
              }}
              disabled={!createForm.name || !createForm.slug}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Space Dialog */}
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
                // TODO: Wire to trpc.space.update.mutate(...)
                setEditDialogOpen(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
