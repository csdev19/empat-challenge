import { z } from "zod";

/**
 * Schema for player results structure
 */
export const gameOutputPlayerResultsSchema = z.object({
  slp: z.object({
    score: z.number().int().optional(),
    correct: z.number().int().optional(),
    incorrect: z.number().int().optional(),
  }).optional(),
  student: z.object({
    score: z.number().int().optional(),
    correct: z.number().int().optional(),
    incorrect: z.number().int().optional(),
  }).optional(),
});

/**
 * Schema for individual game events
 */
export const gameOutputEventSchema = z.object({
  type: z.string(),
  player: z.enum(["slp", "student"]),
  timestamp: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Base schema for Game Output
 * Represents the complete domain model with all fields
 */
export const gameOutputBaseSchema = z.object({
  id: z.uuid(),
  therapySessionId: z.uuid(),
  gameType: z.string().min(1, "Game type is required"),
  gameState: z.record(z.string(), z.unknown()).nullable().optional(),
  score: z.number().int().nullable().optional(),
  accuracy: z.number().min(0, "Accuracy must be at least 0").max(100, "Accuracy cannot exceed 100").nullable().optional(),
  duration: z.number().int().positive("Duration must be positive").nullable().optional(), // Duration in seconds
  turnsPlayed: z.number().int().nonnegative("Turns played cannot be negative").nullable().optional(),
  playerResults: gameOutputPlayerResultsSchema.nullable().optional(),
  gameEvents: z.array(gameOutputEventSchema).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  startedAt: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Schema for creating a game output record
 */
export const createGameOutputSchema = gameOutputBaseSchema.pick({
  therapySessionId: true,
  gameType: true,
}).extend({
  gameState: z.record(z.string(), z.unknown()).optional(),
  score: z.number().int().optional(),
  accuracy: z.number().min(0, "Accuracy must be at least 0").max(100, "Accuracy cannot exceed 100").optional(),
  duration: z.number().int().positive("Duration must be positive").optional(),
  turnsPlayed: z.number().int().nonnegative("Turns played cannot be negative").optional(),
  playerResults: gameOutputPlayerResultsSchema.optional(),
  gameEvents: z.array(gameOutputEventSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

/**
 * Schema for updating a game output (e.g., final score)
 */
export const updateGameOutputSchema = createGameOutputSchema.partial().extend({
  id: z.uuid(),
});

// Type exports for TypeScript
export type GameOutputBase = z.infer<typeof gameOutputBaseSchema>;
export type CreateGameOutput = z.infer<typeof createGameOutputSchema>;
export type UpdateGameOutput = z.infer<typeof updateGameOutputSchema>;
export type GameOutputPlayerResults = z.infer<typeof gameOutputPlayerResultsSchema>;
export type GameOutputEvent = z.infer<typeof gameOutputEventSchema>;
