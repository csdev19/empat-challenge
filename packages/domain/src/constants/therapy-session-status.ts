/**
 * Therapy Session Status Constants
 * Used for tracking the status of therapy sessions
 */

export const THERAPY_SESSION_STATUSES = {
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const THERAPY_SESSION_STATUS_VALUES = [
  THERAPY_SESSION_STATUSES.SCHEDULED,
  THERAPY_SESSION_STATUSES.ACTIVE,
  THERAPY_SESSION_STATUSES.COMPLETED,
  THERAPY_SESSION_STATUSES.CANCELLED,
] as const;

export type TherapySessionStatus =
  (typeof THERAPY_SESSION_STATUSES)[keyof typeof THERAPY_SESSION_STATUSES];
