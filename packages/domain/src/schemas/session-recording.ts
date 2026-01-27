import { z } from "zod";
import { trialDataBaseSchema } from "./trial-data";

/**
 * Base schema for Session Recording
 * Represents the complete domain model with all fields
 */
export const sessionRecordingBaseSchema = z.object({
  id: z.uuid(),
  therapySessionId: z.uuid(),
  behavioralNotes: z.string().nullable().optional(),
  totalTrials: z.number().int().nonnegative(),
  correctTrials: z.number().int().nonnegative(),
  incorrectTrials: z.number().int().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Schema for creating a session recording
 */
export const createSessionRecordingSchema = sessionRecordingBaseSchema
  .pick({
    therapySessionId: true,
  })
  .extend({
    behavioralNotes: z.string().optional(),
  });

/**
 * Schema for updating session recording (behavioral notes and metrics)
 */
export const updateSessionRecordingSchema = z.object({
  behavioralNotes: z.string().optional(),
});

/**
 * Schema for session recording with trials included
 */
export const sessionRecordingWithTrialsSchema = sessionRecordingBaseSchema.extend({
  trials: z.array(trialDataBaseSchema).optional(),
});

// Type exports for TypeScript
export type SessionRecordingBase = z.infer<typeof sessionRecordingBaseSchema>;
export type CreateSessionRecording = z.infer<typeof createSessionRecordingSchema>;
export type UpdateSessionRecording = z.infer<typeof updateSessionRecordingSchema>;
export type SessionRecordingWithTrials = z.infer<typeof sessionRecordingWithTrialsSchema>;
