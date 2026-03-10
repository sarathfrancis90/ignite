/**
 * RBAC Permission System
 *
 * 3-level resolution:
 *   Level 1: Global Role → PLATFORM_ADMIN bypasses all checks
 *   Level 2: Resource Role → campaign/channel-specific roles
 *   Level 3: Scope → org unit membership, campaign audience
 *
 * Permission definitions are centralized here as a const map.
 * Every tRPC procedure must use requirePermission().
 */

// ─── Permission Actions ────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Campaign permissions
  "campaign.create": "campaign.create",
  "campaign.read": "campaign.read",
  "campaign.update": "campaign.update",
  "campaign.delete": "campaign.delete",
  "campaign.manage": "campaign.manage",
  "campaign.publish": "campaign.publish",

  // Idea permissions
  "idea.create": "idea.create",
  "idea.read": "idea.read",
  "idea.update": "idea.update",
  "idea.delete": "idea.delete",
  "idea.moderate": "idea.moderate",
  "idea.evaluate": "idea.evaluate",
  "idea.coach": "idea.coach",

  // User/admin permissions
  "user.read": "user.read",
  "user.update.self": "user.update.self",
  "user.manage": "user.manage",
  "user.deactivate": "user.deactivate",

  // Org unit permissions
  "orgUnit.read": "orgUnit.read",
  "orgUnit.manage": "orgUnit.manage",

  // Group permissions
  "group.read": "group.read",
  "group.manage": "group.manage",

  // Evaluation permissions
  "evaluation.create": "evaluation.create",
  "evaluation.read": "evaluation.read",
  "evaluation.submit": "evaluation.submit",
  "evaluation.manage": "evaluation.manage",

  // Admin permissions
  "admin.access": "admin.access",
  "admin.settings": "admin.settings",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Global Role Permissions ───────────────────────────────────────────────

export type GlobalRole =
  | "PLATFORM_ADMIN"
  | "INNOVATION_MANAGER"
  | "CONTRIBUTOR"
  | "EVALUATOR"
  | "MODERATOR"
  | "IDEA_COACH";

/**
 * Permissions granted by global role.
 * PLATFORM_ADMIN gets all permissions (handled by bypass logic, not listed here).
 */
export const GLOBAL_ROLE_PERMISSIONS: Record<
  Exclude<GlobalRole, "PLATFORM_ADMIN">,
  readonly Permission[]
> = {
  INNOVATION_MANAGER: [
    "campaign.create",
    "campaign.read",
    "campaign.update",
    "campaign.manage",
    "campaign.publish",
    "idea.read",
    "idea.moderate",
    "user.read",
    "orgUnit.read",
    "group.read",
    "evaluation.create",
    "evaluation.read",
    "evaluation.manage",
    "admin.access",
  ],
  CONTRIBUTOR: [
    "campaign.read",
    "idea.create",
    "idea.read",
    "idea.update",
    "user.read",
    "user.update.self",
    "orgUnit.read",
    "evaluation.read",
  ],
  EVALUATOR: [
    "campaign.read",
    "idea.read",
    "idea.evaluate",
    "user.read",
    "evaluation.read",
    "evaluation.submit",
  ],
  MODERATOR: [
    "campaign.read",
    "idea.read",
    "idea.moderate",
    "user.read",
    "orgUnit.read",
  ],
  IDEA_COACH: [
    "campaign.read",
    "idea.read",
    "idea.coach",
    "idea.update",
    "user.read",
  ],
} as const;

// ─── Resource (Campaign) Role Permissions ──────────────────────────────────

export type CampaignRole =
  | "MANAGER"
  | "SPONSOR"
  | "MODERATOR"
  | "EVALUATOR"
  | "SEEDING_TEAM"
  | "IDEA_COACH";

export const CAMPAIGN_ROLE_PERMISSIONS: Record<
  CampaignRole,
  readonly Permission[]
> = {
  MANAGER: [
    "campaign.read",
    "campaign.update",
    "campaign.manage",
    "campaign.publish",
    "idea.read",
    "idea.moderate",
    "idea.delete",
    "evaluation.create",
    "evaluation.read",
    "evaluation.manage",
  ],
  SPONSOR: ["campaign.read", "idea.read", "evaluation.read"],
  MODERATOR: ["campaign.read", "idea.read", "idea.moderate"],
  EVALUATOR: [
    "campaign.read",
    "idea.read",
    "idea.evaluate",
    "evaluation.read",
    "evaluation.submit",
  ],
  SEEDING_TEAM: ["campaign.read", "idea.create", "idea.read", "idea.update"],
  IDEA_COACH: ["campaign.read", "idea.read", "idea.coach", "idea.update"],
} as const;

// ─── Permission Resolution ─────────────────────────────────────────────────

export interface PermissionContext {
  userId: string;
  globalRole: GlobalRole;
  isActive: boolean;
  isInternal: boolean;
  orgUnitId: string | null;
}

export interface ResourceContext {
  resourceId: string;
  resourceType: "campaign" | "channel";
  campaignRoles?: CampaignRole[];
  audienceType?: string;
  audienceOrgUnitIds?: string[];
}

/**
 * Check if a user has a specific permission based on global role.
 * PLATFORM_ADMIN bypasses all checks.
 */
export function hasGlobalPermission(
  globalRole: GlobalRole,
  permission: Permission,
): boolean {
  if (globalRole === "PLATFORM_ADMIN") return true;

  const rolePermissions = GLOBAL_ROLE_PERMISSIONS[globalRole];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has a specific permission based on their campaign role(s).
 */
export function hasResourcePermission(
  campaignRoles: CampaignRole[],
  permission: Permission,
): boolean {
  return campaignRoles.some((role) => {
    const rolePermissions = CAMPAIGN_ROLE_PERMISSIONS[role];
    return rolePermissions.includes(permission);
  });
}

/**
 * Check if a user has scope-level access to a campaign based on audience rules.
 * Used for list endpoints to filter results (WHERE clause filtering).
 */
export function hasScopeAccess(
  user: Pick<PermissionContext, "isInternal" | "orgUnitId">,
  resource: Pick<ResourceContext, "audienceType" | "audienceOrgUnitIds">,
): boolean {
  const audienceType = resource.audienceType;

  if (audienceType === "ALL_INTERNAL" && user.isInternal) return true;
  if (audienceType === "ALL_EXTERNAL" && !user.isInternal) return true;
  if (audienceType === "MIXED") return true;

  if (
    (audienceType === "SELECTED_INTERNAL" ||
      audienceType === "SELECTED_EXTERNAL") &&
    user.orgUnitId &&
    resource.audienceOrgUnitIds
  ) {
    return resource.audienceOrgUnitIds.includes(user.orgUnitId);
  }

  return false;
}

/**
 * Full 3-level permission resolution.
 *
 * Resolution order:
 *   1. Deactivated users are always denied
 *   2. Global Role check (PLATFORM_ADMIN bypasses all)
 *   3. Resource Role check (if resource context provided)
 *   4. Scope check (if resource context provided)
 */
export function resolvePermission(
  user: PermissionContext,
  permission: Permission,
  resource?: ResourceContext,
): boolean {
  // Deactivated users are always denied
  if (!user.isActive) return false;

  // Level 1: Global role check
  if (hasGlobalPermission(user.globalRole, permission)) return true;

  // Level 2: Resource role check (if context provided)
  if (resource?.campaignRoles && resource.campaignRoles.length > 0) {
    if (hasResourcePermission(resource.campaignRoles, permission)) return true;
  }

  return false;
}

// ─── Redis Cache Key Helpers ───────────────────────────────────────────────

export const PERMISSION_CACHE_TTL = 300; // 5 minutes in seconds

export function permissionCacheKey(userId: string, resourceId: string): string {
  return `rbac:${userId}:${resourceId}`;
}

export function userPermissionCacheKey(userId: string): string {
  return `rbac:${userId}:global`;
}
