"use client";

import * as React from "react";
import { UserCog, Plus } from "lucide-react";
import { GroupList, GroupDetailPanel } from "@/components/admin/GroupManager";
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

// Placeholder for tRPC integration — this page demonstrates the UI structure.
// Once tRPC client is wired, replace with trpc.admin.groupList.useQuery() etc.

export default function AdminGroupsPage() {
  const [search, setSearch] = React.useState("");
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<{
    id: string;
    name: string;
    description: string | null;
  } | null>(null);

  // Create form state
  const [createForm, setCreateForm] = React.useState({
    name: "",
    description: "",
  });

  // Edit form state
  const [editForm, setEditForm] = React.useState({
    name: "",
    description: "",
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <UserCog className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">User Groups</h1>
          <p className="text-sm text-gray-500">
            Manage groups for cross-cutting permissions and campaign audience targeting
          </p>
        </div>
      </div>

      {/* Split layout: group list + detail panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Group list */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <GroupList
            groups={[]}
            isLoading={false}
            search={search}
            onSearchChange={setSearch}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onLoadMore={() => {}}
            onCreateGroup={() => {
              setCreateForm({ name: "", description: "" });
              setCreateDialogOpen(true);
            }}
            onEditGroup={(group) => {
              setEditingGroup(group);
              setEditForm({
                name: group.name,
                description: group.description ?? "",
              });
              setEditDialogOpen(true);
            }}
            onDeleteGroup={() => {
              // TODO: Wire to trpc.admin.groupDelete.mutate(...)
            }}
          />
        </div>

        {/* Right: Group detail panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {selectedGroupId ? (
            <GroupDetailPanel
              group={{
                id: selectedGroupId,
                name: "Select a group",
                description: null,
                isActive: true,
                memberCount: 0,
                members: [],
              }}
              isLoading={false}
              onAddMember={() => {
                // TODO: Wire to add member dialog
              }}
              onRemoveMember={() => {
                // TODO: Wire to trpc.admin.groupRemoveMember.mutate(...)
              }}
            />
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-gray-400">
              <UserCog className="mb-3 h-12 w-12" />
              <p className="text-sm font-medium">Select a group</p>
              <p className="mt-1 text-xs">Choose a group from the list to view its members</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent onClose={() => setCreateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                placeholder="Group name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
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
                // TODO: Wire to trpc.admin.groupCreate.mutate(createForm)
                setCreateDialogOpen(false);
              }}
              disabled={!createForm.name}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClose={() => setEditDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Name</Label>
                <Input
                  id="edit-group-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-description">Description</Label>
                <Textarea
                  id="edit-group-description"
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
                // TODO: Wire to trpc.admin.groupUpdate.mutate(...)
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
