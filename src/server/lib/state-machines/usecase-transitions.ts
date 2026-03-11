import type { UseCaseStatus } from "@prisma/client";

/**
 * Use Case pipeline state machine.
 * Pipeline: IDENTIFIED > QUALIFICATION > EVALUATION > PILOT > PARTNERSHIP
 * ARCHIVED can be reached from any non-terminal state.
 * Status changes ONLY go through transitionUseCase() — never direct prisma.update({ status }).
 */

const TRANSITION_MAP: Record<UseCaseStatus, UseCaseStatus[]> = {
  IDENTIFIED: ["QUALIFICATION"],
  QUALIFICATION: ["EVALUATION"],
  EVALUATION: ["PILOT"],
  PILOT: ["PARTNERSHIP"],
  PARTNERSHIP: [],
  ARCHIVED: [],
};

/**
 * Ordered list of pipeline phases for display.
 */
export const USE_CASE_PHASE_ORDER: UseCaseStatus[] = [
  "IDENTIFIED",
  "QUALIFICATION",
  "EVALUATION",
  "PILOT",
  "PARTNERSHIP",
  "ARCHIVED",
];

/**
 * Pipeline phases (excludes ARCHIVED) for funnel visualization.
 */
export const USE_CASE_PIPELINE_PHASES: UseCaseStatus[] = [
  "IDENTIFIED",
  "QUALIFICATION",
  "EVALUATION",
  "PILOT",
  "PARTNERSHIP",
];

/**
 * Get valid next statuses for a use case given its current status.
 */
export function getValidUseCaseTransitions(currentStatus: UseCaseStatus): UseCaseStatus[] {
  return TRANSITION_MAP[currentStatus] ?? [];
}

/**
 * Check if a transition from currentStatus to targetStatus is valid.
 */
export function isValidUseCaseTransition(
  currentStatus: UseCaseStatus,
  targetStatus: UseCaseStatus,
): boolean {
  const validTargets = getValidUseCaseTransitions(currentStatus);
  return validTargets.includes(targetStatus);
}

/**
 * Statuses from which a use case can be archived.
 */
const ARCHIVABLE_STATUSES: UseCaseStatus[] = ["IDENTIFIED", "QUALIFICATION", "EVALUATION", "PILOT"];

/**
 * Check if a use case can be archived from its current status.
 */
export function canArchiveUseCase(currentStatus: UseCaseStatus): boolean {
  return ARCHIVABLE_STATUSES.includes(currentStatus);
}

/**
 * Check if a use case can be unarchived.
 */
export function canUnarchiveUseCase(currentStatus: UseCaseStatus): boolean {
  return currentStatus === "ARCHIVED";
}

/**
 * Human-readable labels for each use case status.
 */
export const USE_CASE_STATUS_LABELS: Record<UseCaseStatus, string> = {
  IDENTIFIED: "Identified",
  QUALIFICATION: "Qualification",
  EVALUATION: "Evaluation",
  PILOT: "Pilot",
  PARTNERSHIP: "Partnership",
  ARCHIVED: "Archived",
};

/**
 * Timestamp field name for each pipeline stage (for tracking when entered).
 */
export const STATUS_TIMESTAMP_FIELD: Partial<Record<UseCaseStatus, string>> = {
  QUALIFICATION: "qualifiedAt",
  EVALUATION: "evaluationAt",
  PILOT: "pilotAt",
  PARTNERSHIP: "partnershipAt",
  ARCHIVED: "archivedAt",
};
