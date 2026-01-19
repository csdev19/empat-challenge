import type { ObjectProperties } from "../types";

/**
 * Hiring Process Status Constants
 * Represents the current stage of a hiring process
 */
export const HIRING_PROCESS_STATUSES = {
  FIRST_CONTACT: "first-contact",
  ONGOING: "ongoing",
  ON_HOLD: "on-hold",
  REJECTED: "rejected",
  DROPPED_OUT: "dropped-out",
  HIRED: "hired",
} as const;

/**
 * Type for hiring process status values
 */
export type HiringProcessStatus = ObjectProperties<typeof HIRING_PROCESS_STATUSES>;

export const HIRING_PROCESS_STATUS_VALUES = [
  HIRING_PROCESS_STATUSES.FIRST_CONTACT,
  HIRING_PROCESS_STATUSES.ONGOING,
  HIRING_PROCESS_STATUSES.ON_HOLD,
  HIRING_PROCESS_STATUSES.REJECTED,
  HIRING_PROCESS_STATUSES.DROPPED_OUT,
  HIRING_PROCESS_STATUSES.HIRED,
] as const;

/**
 * Status metadata for UI display and business logic
 */
export const HIRING_PROCESS_STATUS_INFO = {
  [HIRING_PROCESS_STATUSES.FIRST_CONTACT]: {
    label: "First Contact",
    description: "Initial outreach via LinkedIn, email, or other channel",
    order: 1,
    category: "active" as const,
  },
  [HIRING_PROCESS_STATUSES.ONGOING]: {
    label: "Ongoing",
    description: "Active interview process",
    order: 2,
    category: "active" as const,
  },
  [HIRING_PROCESS_STATUSES.ON_HOLD]: {
    label: "On Hold",
    description: "Position is cold, stopped, or no recent updates",
    order: 3,
    category: "active" as const,
  },
  [HIRING_PROCESS_STATUSES.REJECTED]: {
    label: "Rejected",
    description: "Application or interview was rejected",
    order: 4,
    category: "terminal" as const,
  },
  [HIRING_PROCESS_STATUSES.DROPPED_OUT]: {
    label: "Dropped Out",
    description: "Candidate withdrew from the process",
    order: 5,
    category: "terminal" as const,
  },
  [HIRING_PROCESS_STATUSES.HIRED]: {
    label: "Hired",
    description: "Successfully hired",
    order: 6,
    category: "terminal" as const,
  },
} as const;

/**
 * Valid status transitions
 * Defines which statuses can transition to which other statuses
 */
export const STATUS_TRANSITIONS: Record<HiringProcessStatus, HiringProcessStatus[]> = {
  [HIRING_PROCESS_STATUSES.FIRST_CONTACT]: [
    HIRING_PROCESS_STATUSES.ONGOING,
    HIRING_PROCESS_STATUSES.ON_HOLD,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
  ],
  [HIRING_PROCESS_STATUSES.ONGOING]: [
    HIRING_PROCESS_STATUSES.ON_HOLD,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
    HIRING_PROCESS_STATUSES.HIRED,
  ],
  [HIRING_PROCESS_STATUSES.ON_HOLD]: [
    HIRING_PROCESS_STATUSES.ONGOING,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
    HIRING_PROCESS_STATUSES.HIRED,
  ],
  [HIRING_PROCESS_STATUSES.REJECTED]: [], // Terminal status
  [HIRING_PROCESS_STATUSES.DROPPED_OUT]: [], // Terminal status
  [HIRING_PROCESS_STATUSES.HIRED]: [], // Terminal status
};

/**
 * Check if a value is a valid hiring process status
 */
export function isValidHiringProcessStatus(value: string): value is HiringProcessStatus {
  return HIRING_PROCESS_STATUS_VALUES.includes(value as HiringProcessStatus);
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: HiringProcessStatus,
  to: HiringProcessStatus,
): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Get all active statuses (non-terminal)
 */
export function getActiveStatuses(): HiringProcessStatus[] {
  return HIRING_PROCESS_STATUS_VALUES.filter(
    (status) => HIRING_PROCESS_STATUS_INFO[status].category === "active",
  );
}

/**
 * Get all terminal statuses
 */
export function getTerminalStatuses(): HiringProcessStatus[] {
  return HIRING_PROCESS_STATUS_VALUES.filter(
    (status) => HIRING_PROCESS_STATUS_INFO[status].category === "terminal",
  );
}

/**
 * Default status for new hiring processes
 */
export const DEFAULT_HIRING_PROCESS_STATUS = HIRING_PROCESS_STATUSES.FIRST_CONTACT;
