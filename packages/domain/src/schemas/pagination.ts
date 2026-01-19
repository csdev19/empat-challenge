import { z } from "zod";

/**
 * Pagination query parameters schema
 * Used for list endpoints that support pagination
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10)
    .optional(),
});

// Type exports
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
