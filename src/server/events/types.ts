export interface EventPayload {
  entity: string;
  entityId: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EventMap {
  "campaign.created": EventPayload;
  "campaign.updated": EventPayload;
  "campaign.phaseChanged": EventPayload;
  "idea.submitted": EventPayload;
  "idea.updated": EventPayload;
  "idea.statusChanged": EventPayload;
  "idea.voted": EventPayload;
  "user.registered": EventPayload;
  "user.profileUpdated": EventPayload;
  "evaluation.completed": EventPayload;
  "notification.created": EventPayload;
  "rbac.roleAssigned": EventPayload;
  "rbac.roleRemoved": EventPayload;
  "rbac.globalRoleChanged": EventPayload;
  "orgUnit.created": EventPayload;
  "orgUnit.updated": EventPayload;
  "orgUnit.deleted": EventPayload;
  "orgUnit.userAssigned": EventPayload;
  "orgUnit.userRemoved": EventPayload;
  "user.adminCreated": EventPayload;
  "user.adminUpdated": EventPayload;
  "user.statusChanged": EventPayload;
  "group.created": EventPayload;
  "group.updated": EventPayload;
  "group.deleted": EventPayload;
  "group.memberAdded": EventPayload;
  "group.memberRemoved": EventPayload;
  "space.created": EventPayload;
  "space.updated": EventPayload;
  "space.archived": EventPayload;
  "space.activated": EventPayload;
  "space.memberAdded": EventPayload;
  "space.memberRemoved": EventPayload;
  "space.memberRoleChanged": EventPayload;
}

export type EventName = keyof EventMap;
