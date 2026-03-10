/**
 * Centralized permission definitions for RBAC.
 *
 * 3-level resolution:
 *   Level 1: Global Role — PLATFORM_ADMIN bypasses all checks
 *   Level 2: Resource Role — campaign/channel membership role
 *   Level 3: Scope — org unit, audience, or ownership
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
type ResourceRoleName =
  | "CAMPAIGN_MANAGER"
  | "CAMPAIGN_COACH"
  | "CAMPAIGN_CONTRIBUTOR"
  | "CAMPAIGN_MODERATOR"
  | "CAMPAIGN_EVALUATOR"
  | "CAMPAIGN_SEEDER"
  | "CHANNEL_MANAGER"
  | "CHANNEL_CONTRIBUTOR";

/**
 * Global role permissions — what each global role can do without any resource context.
 * PLATFORM_ADMIN bypasses all checks (handled in middleware).
 */
export const GLOBAL_ROLE_PERMISSIONS: Record<GlobalRoleName, readonly ActionType[]> = {
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
 * Resource role permissions — what each resource-level role grants on that specific resource.
 */
export const RESOURCE_ROLE_PERMISSIONS: Record<ResourceRoleName, readonly ActionType[]> = {
  CAMPAIGN_MANAGER: [
    Action.CAMPAIGN_READ,
    Action.CAMPAIGN_UPDATE,
    Action.CAMPAIGN_MANAGE,
    Action.CAMPAIGN_TRANSITION,
    Action.CAMPAIGN_ASSIGN_ROLES,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_DELETE_ANY,
    Action.IDEA_TRANSITION,
    Action.IDEA_MODERATE,
    Action.EVALUATION_CREATE,
    Action.EVALUATION_VIEW_RESULTS,
  ],
  CAMPAIGN_COACH: [
    Action.CAMPAIGN_READ,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_TRANSITION,
    Action.IDEA_MODERATE,
    Action.EVALUATION_PARTICIPATE,
    Action.EVALUATION_VIEW_RESULTS,
  ],
  CAMPAIGN_CONTRIBUTOR: [
    Action.CAMPAIGN_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.EVALUATION_PARTICIPATE,
  ],
  CAMPAIGN_MODERATOR: [
    Action.CAMPAIGN_READ,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_MODERATE,
  ],
  CAMPAIGN_EVALUATOR: [
    Action.CAMPAIGN_READ,
    Action.IDEA_READ,
    Action.EVALUATION_CREATE,
    Action.EVALUATION_PARTICIPATE,
    Action.EVALUATION_VIEW_RESULTS,
  ],
  CAMPAIGN_SEEDER: [
    Action.CAMPAIGN_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
  ],
  CHANNEL_MANAGER: [
    Action.CHANNEL_READ,
    Action.CHANNEL_UPDATE,
    Action.CHANNEL_MANAGE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_MODERATE,
  ],
  CHANNEL_CONTRIBUTOR: [
    Action.CHANNEL_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
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

/**
 * Check whether a resource role grants a specific action.
 */
export function resourceRoleHasPermission(role: ResourceRoleName, action: ActionType): boolean {
  const permissions = RESOURCE_ROLE_PERMISSIONS[role];
  return permissions.includes(action);
}
