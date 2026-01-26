import { z } from "zod";

/**
 * Base schema for SLP (Speech Language Pathologist)
 * Represents the complete domain model with all fields
 */
export const slpBaseSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Schema for creating an SLP profile
 */
export const createSLPSchema = slpBaseSchema.pick({
  name: true,
}).extend({
  phone: z.string().optional(),
});

/**
 * Schema for updating an SLP profile
 */
export const updateSLPSchema = createSLPSchema.partial();

// Type exports for TypeScript
export type SLPBase = z.infer<typeof slpBaseSchema>;
export type CreateSLP = z.infer<typeof createSLPSchema>;
export type UpdateSLP = z.infer<typeof updateSLPSchema>;
