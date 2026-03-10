"use client";

import * as React from "react";
import {
  Search,
  Plus,
  ChevronDown,
  MoreHorizontal,
  UserX,
  UserCheck,
  Shield,
  Building2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ── Types ──────────────────────────────────────────────────

interface OrgUnitRef {
  orgUnit: { id: string; name: string };
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  globalRole: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER";
  isActive: boolean;
  createdAt: Date | string;
  orgUnitAssignments: OrgUnitRef[];
}

interface UserTableProps {
  users: UserItem[];
  nextCursor?: string;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (status: "all" | "active" | "inactive") => void;
  roleFilter?: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER";
  onRoleFilterChange: (
    role: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER" | undefined,
  ) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onLoadMore: () => void;
  onCreateUser: () => void;
  onEditUser: (user: UserItem) => void;
  onToggleActive: (userId: string, isActive: boolean) => void;
  onBulkAssignRole: (role: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER") => void;
  onBulkDeactivate: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Admin",
  INNOVATION_MANAGER: "Manager",
  MEMBER: "Member",
};

const ROLE_VARIANTS: Record<string, "default" | "accent" | "secondary"> = {
  PLATFORM_ADMIN: "default",
  INNOVATION_MANAGER: "accent",
  MEMBER: "secondary",
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserTable({
  users,
  nextCursor,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  selectedIds,
  onSelectionChange,
  onLoadMore,
  onCreateUser,
  onEditUser,
  onToggleActive,
  onBulkAssignRole,
  onBulkDeactivate,
}: UserTableProps) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(users.map((u) => u.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "all" | "active" | "inactive")}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Role filter */}
        <select
          value={roleFilter ?? ""}
          onChange={(e) =>
            onRoleFilterChange(
              (e.target.value as "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER") || undefined,
            )
          }
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          <option value="PLATFORM_ADMIN">Admin</option>
          <option value="INNOVATION_MANAGER">Manager</option>
          <option value="MEMBER">Member</option>
        </select>

        <Button onClick={onCreateUser}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2">
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <BulkRoleDropdown onSelect={onBulkAssignRole} />
            <Button variant="destructive" size="sm" onClick={onBulkDeactivate}>
              <UserX className="mr-1 h-3.5 w-3.5" />
              Deactivate
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Org Units
              </th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr
                key={user.id}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  selectedIds.has(user.id) && "bg-primary-50/50",
                )}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => toggleOne(user.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {user.image ? (
                        <AvatarImage src={user.image} alt={user.name ?? user.email} />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {user.name ?? "Unnamed"}
                      </p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_VARIANTS[user.globalRole]}>
                    {ROLE_LABELS[user.globalRole]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? "secondary" : "destructive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.orgUnitAssignments.length === 0 && (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                    {user.orgUnitAssignments.slice(0, 2).map((a) => (
                      <span
                        key={a.orgUnit.id}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        <Building2 className="h-3 w-3" />
                        {a.orgUnit.name}
                      </span>
                    ))}
                    {user.orgUnitAssignments.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{user.orgUnitAssignments.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <UserRowActions
                    user={user}
                    onEdit={() => onEditUser(user)}
                    onToggleActive={() => onToggleActive(user.id, !user.isActive)}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-500">No users found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────

function UserRowActions({
  user,
  onEdit,
  onToggleActive,
}: {
  user: UserItem;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            onKeyDown={() => {}}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Shield className="h-4 w-4" />
              Edit User
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onToggleActive();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {user.isActive ? (
                <>
                  <UserX className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Deactivate</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Reactivate</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BulkRoleDropdown({
  onSelect,
}: {
  onSelect: (role: "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER") => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        <Shield className="mr-1 h-3.5 w-3.5" />
        Assign Role
        <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            onKeyDown={() => {}}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div className="absolute left-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"] as const).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setOpen(false);
                  onSelect(role);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
