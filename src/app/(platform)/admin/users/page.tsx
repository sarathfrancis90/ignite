"use client";

import * as React from "react";
import { Users, Plus } from "lucide-react";
import { UserTable } from "@/components/admin/UserTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Placeholder for tRPC integration — this page demonstrates the UI structure.
// Once tRPC client is wired, replace with trpc.admin.userList.useQuery() etc.

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = React.useState<
    "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER" | undefined
  >(undefined);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<{
    id: string;
    name: string | null;
    email: string;
    globalRole: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER";
  } | null>(null);

  // Create form state
  const [createForm, setCreateForm] = React.useState({
    email: "",
    name: "",
    globalRole: "MEMBER" as "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER",
  });

  // Edit form state
  const [editForm, setEditForm] = React.useState({
    name: "",
    globalRole: "MEMBER" as "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER",
  });

  const handleEditUser = (user: {
    id: string;
    name: string | null;
    email: string;
    globalRole: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER";
  }) => {
    setEditingUser(user);
    setEditForm({
      name: user.name ?? "",
      globalRole: user.globalRole,
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Users className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">
            Create, edit, and manage user accounts and role assignments
          </p>
        </div>
      </div>

      {/* User table — real data will come from tRPC */}
      <UserTable
        users={[]}
        isLoading={false}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onLoadMore={() => {}}
        onCreateUser={() => {
          setCreateForm({ email: "", name: "", globalRole: "MEMBER" });
          setCreateDialogOpen(true);
        }}
        onEditUser={handleEditUser}
        onToggleActive={() => {}}
        onBulkAssignRole={() => {}}
        onBulkDeactivate={() => {}}
      />

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent onClose={() => setCreateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Global Role</Label>
              <select
                id="create-role"
                value={createForm.globalRole}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    globalRole: e.target.value as
                      | "PLATFORM_ADMIN"
                      | "INNOVATION_MANAGER"
                      | "MEMBER",
                  }))
                }
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <option value="MEMBER">Member</option>
                <option value="INNOVATION_MANAGER">Innovation Manager</option>
                <option value="PLATFORM_ADMIN">Platform Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Wire to trpc.admin.userCreate.mutate(createForm)
                setCreateDialogOpen(false);
              }}
              disabled={!createForm.email || !createForm.name}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClose={() => setEditDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm text-gray-600">{editingUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Global Role</Label>
                <select
                  id="edit-role"
                  value={editForm.globalRole}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      globalRole: e.target.value as
                        | "PLATFORM_ADMIN"
                        | "INNOVATION_MANAGER"
                        | "MEMBER",
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="INNOVATION_MANAGER">Innovation Manager</option>
                  <option value="PLATFORM_ADMIN">Platform Admin</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Wire to trpc.admin.userUpdate.mutate(...)
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
