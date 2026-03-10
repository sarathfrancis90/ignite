import { useSession } from "next-auth/react";
import { globalRoleHasPermission } from "@/lib/permissions";
import type { ActionType } from "@/lib/permissions";

/**
 * Client-side permission check based on the user's global role.
 * Returns whether the current user has the specified permission.
 *
 * Note: This only checks global role permissions. Resource-level
 * permissions are enforced server-side via tRPC middleware.
 */
export function usePermission(action: ActionType): boolean {
  const { data: session } = useSession();

  if (!session?.user?.globalRole) {
    return false;
  }

  return globalRoleHasPermission(session.user.globalRole, action);
}
