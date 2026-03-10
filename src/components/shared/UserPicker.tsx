"use client";

import * as React from "react";
import { Search, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";

interface PickedUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface UserPickerProps {
  label: string;
  selectedUsers: PickedUser[];
  onAdd: (user: PickedUser) => void;
  onRemove: (userId: string) => void;
  placeholder?: string;
  maxUsers?: number;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserPicker({
  label,
  selectedUsers,
  onAdd,
  onRemove,
  placeholder = "Search by name or email...",
  maxUsers,
}: UserPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const excludeIds = selectedUsers.map((u) => u.id);

  const { data: searchResults, isFetching } = trpc.campaign.searchUsers.useQuery(
    { search: searchQuery, limit: 10, excludeIds },
    { enabled: searchQuery.length >= 2 },
  );

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user: PickedUser) => {
    onAdd(user);
    setSearchQuery("");
    setIsOpen(false);
  };

  const atCapacity = maxUsers !== undefined && selectedUsers.length >= maxUsers;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {/* Search Input */}
      {!atCapacity && (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
              placeholder={placeholder}
              className="pl-10"
            />
          </div>

          {/* Dropdown */}
          {isOpen && searchQuery.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
              {isFetching && <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>}
              {!isFetching && searchResults && searchResults.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
              )}
              {!isFetching &&
                searchResults?.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
                    onClick={() => handleSelect(user)}
                  >
                    <Avatar className="h-8 w-8">
                      {user.image ? (
                        <AvatarImage src={user.image} alt={user.name ?? user.email} />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {user.name ?? "Unnamed"}
                      </p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Users List */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <Avatar className="h-8 w-8">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name ?? user.email} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.name ?? "Unnamed"}
                </p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(user.id)}
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {selectedUsers.length === 0 && <p className="text-xs text-gray-400">No users assigned yet</p>}
    </div>
  );
}

export type { PickedUser };
