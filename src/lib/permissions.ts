/**
 * Client-safe permission utilities.
 *
 * This module extracts the pure, stateless permission constants and check
 * functions needed by client components (e.g., usePermission hook).
 * The authoritative RBAC definitions live in src/server/lib/permissions.ts
 * — keep these in sync when adding new actions or roles.
 */

export const Action = {
  // User management
  USER_READ_OWN: "user.read.own",
  USER_UPDATE_OWN: "user.update.own",
  USER_READ_ANY: "user.read.any",
  USER_UPDATE_ANY: "user.update.any",
  USER_DEACTIVATE: "user.deactivate",
  USER_CHANGE_ROLE: "user.changeRole",

  // Campaign management
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_READ: "campaign.read",
  CAMPAIGN_UPDATE: "campaign.update",
  CAMPAIGN_DELETE: "campaign.delete",
  CAMPAIGN_MANAGE: "campaign.manage",
  CAMPAIGN_TRANSITION: "campaign.transition",
  CAMPAIGN_ASSIGN_ROLES: "campaign.assignRoles",

  // Channel management
  CHANNEL_CREATE: "channel.create",
  CHANNEL_READ: "channel.read",
  CHANNEL_UPDATE: "channel.update",
  CHANNEL_DELETE: "channel.delete",
  CHANNEL_MANAGE: "channel.manage",

  // Idea management
  IDEA_CREATE: "idea.create",
  IDEA_READ: "idea.read",
  IDEA_UPDATE_OWN: "idea.update.own",
  IDEA_UPDATE_ANY: "idea.update.any",
  IDEA_DELETE_OWN: "idea.delete.own",
  IDEA_DELETE_ANY: "idea.delete.any",
  IDEA_TRANSITION: "idea.transition",
  IDEA_MODERATE: "idea.moderate",

  // Evaluation
  EVALUATION_CREATE: "evaluation.create",
  EVALUATION_PARTICIPATE: "evaluation.participate",
  EVALUATION_VIEW_RESULTS: "evaluation.viewResults",

  // Notifications
  NOTIFICATION_READ_OWN: "notification.read.own",
  NOTIFICATION_SEND_BULK: "notification.sendBulk",

  // Admin
  ADMIN_ACCESS: "admin.access",
  ADMIN_MANAGE_USERS: "admin.manageUsers",
  ADMIN_MANAGE_ORG_UNITS: "admin.manageOrgUnits",
  ADMIN_MANAGE_GROUPS: "admin.manageGroups",
  ADMIN_VIEW_METRICS: "admin.viewMetrics",
  ADMIN_MANAGE_SPACES: "admin.manageSpaces",
} as const;

export type ActionType = (typeof Action)[keyof typeof Action];

type GlobalRoleName = "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER";

const GLOBAL_ROLE_PERMISSIONS: Record<GlobalRoleName, readonly ActionType[]> = {
  PLATFORM_ADMIN: [], // bypass — never checked
  INNOVATION_MANAGER: [
    Action.USER_READ_OWN,
    Action.USER_UPDATE_OWN,
    Action.USER_READ_ANY,
    Action.CAMPAIGN_CREATE,
    Action.CAMPAIGN_READ,
    Action.CHANNEL_CREATE,
    Action.CHANNEL_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.EVALUATION_VIEW_RESULTS,
    Action.NOTIFICATION_READ_OWN,
  ],
  MEMBER: [
    Action.USER_READ_OWN,
    Action.USER_UPDATE_OWN,
    Action.CAMPAIGN_READ,
    Action.CHANNEL_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.EVALUATION_PARTICIPATE,
    Action.NOTIFICATION_READ_OWN,
  ],
} as const;

/**
 * Check whether a global role grants a specific action.
 */
export function globalRoleHasPermission(role: GlobalRoleName, action: ActionType): boolean {
  if (role === "PLATFORM_ADMIN") return true;
  const permissions = GLOBAL_ROLE_PERMISSIONS[role];
  return permissions.includes(action);
}
