import type { ActivityEventType, ActivityLogEntry } from "@/types/activity";

export interface ActivityDeps {
  createActivityLog: (params: {
    eventType: string;
    ideaId: string | null;
    actorId: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  getActivityLogs: (params: {
    ideaId: string;
    cursor: string | undefined;
    limit: number;
  }) => Promise<{
    items: ActivityLogEntry[];
    nextCursor: string | undefined;
  }>;
}

export async function logActivity(
  eventType: ActivityEventType,
  ideaId: string | null,
  actorId: string,
  metadata: Record<string, unknown>,
  deps: Pick<ActivityDeps, "createActivityLog">,
): Promise<{ id: string }> {
  return deps.createActivityLog({
    eventType,
    ideaId,
    actorId,
    metadata,
  });
}

export async function getActivityFeed(
  ideaId: string,
  cursor: string | undefined,
  limit: number,
  deps: Pick<ActivityDeps, "getActivityLogs">,
): Promise<{ items: ActivityLogEntry[]; nextCursor: string | undefined }> {
  return deps.getActivityLogs({ ideaId, cursor, limit });
}
