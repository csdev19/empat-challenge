import type { ObjectProperties } from "../types";

export const CURRENCIES = {
  USD: "USD",
  PEN: "PEN",
} as const;

/**
 * Type for currency values
 */
export type Currency = ObjectProperties<typeof CURRENCIES>;

export const CURRENCY_VALUES = [CURRENCIES.USD, CURRENCIES.PEN] as const;

/**
 * Check if a value is a valid currency
 */
export function isValidCurrency(value: string): value is Currency {
  return CURRENCY_VALUES.includes(value as Currency);
}

/**
 * Currency display information
 */
export const CURRENCY_INFO: Record<Currency, { label: string; symbol: string }> = {
  USD: { label: "US Dollar", symbol: "$" },
  PEN: { label: "Peruvian Sol", symbol: "S/" },
};
