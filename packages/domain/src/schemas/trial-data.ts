import { z } from "zod";

/**
 * Base schema for Trial Data
 * Represents the complete domain model with all fields
 */
export const trialDataBaseSchema = z.object({
  id: z.uuid(),
  therapySessionId: z.uuid(),
  trialNumber: z.number().int().positive(),
  isCorrect: z.boolean(),
  timestamp: z.coerce.date(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Schema for creating a single trial record
 */
export const createTrialDataSchema = trialDataBaseSchema
  .pick({
    therapySessionId: true,
    isCorrect: true,
  })
  .extend({
    notes: z.string().optional(),
    timestamp: z.coerce.date().optional(),
  });

/**
 * Schema for updating a trial record
 */
export const updateTrialDataSchema = createTrialDataSchema.partial().extend({
  id: z.uuid(),
});

/**
 * Schema for a single trial in a batch
 */
export const trialDataItemSchema = z.object({
  isCorrect: z.boolean(),
  notes: z.string().optional(),
  timestamp: z.coerce.date().optional(),
});

/**
 * Schema for batch trial creation
 */
export const trialDataBatchSchema = z.object({
  therapySessionId: z.uuid(),
  trials: z.array(trialDataItemSchema).min(1, "At least one trial is required"),
});

// Type exports for TypeScript
export type TrialDataBase = z.infer<typeof trialDataBaseSchema>;
export type CreateTrialData = z.infer<typeof createTrialDataSchema>;
export type UpdateTrialData = z.infer<typeof updateTrialDataSchema>;
export type TrialDataItem = z.infer<typeof trialDataItemSchema>;
export type TrialDataBatch = z.infer<typeof trialDataBatchSchema>;
