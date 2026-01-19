import type { ObjectProperties } from "../types";

export const SALARY_RATE_TYPES = {
  MONTHLY: "monthly",
  HOURLY: "hourly",
} as const;

/**
 * Type for salary rate type values
 */
export type SalaryRateType = ObjectProperties<typeof SALARY_RATE_TYPES>;

export const SALARY_RATE_TYPE_VALUES = [
  SALARY_RATE_TYPES.MONTHLY,
  SALARY_RATE_TYPES.HOURLY,
] as const;

/**
 * Check if a value is a valid salary rate type
 */
export function isValidSalaryRateType(value: string): value is SalaryRateType {
  return SALARY_RATE_TYPE_VALUES.includes(value as SalaryRateType);
}

/**
 * Salary rate type display labels
 */
export const SALARY_RATE_TYPE_LABELS: Record<SalaryRateType, string> = {
  [SALARY_RATE_TYPES.MONTHLY]: "Monthly",
  [SALARY_RATE_TYPES.HOURLY]: "Hourly",
};
