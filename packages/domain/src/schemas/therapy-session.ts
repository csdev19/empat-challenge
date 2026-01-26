import { z } from "zod";
import { THERAPY_SESSION_STATUSES } from "../constants";

/**
 * Base schema for Therapy Session
 * Represents the complete domain model with all fields
 */
export const therapySessionBaseSchema = z.object({
  id: z.uuid(),
  slpId: z.uuid(),
  studentId: z.uuid(),
  dailyRoomId: z.string().min(1, "Daily room ID is required"),
  dailyRoomUrl: z.string().url("Daily room URL must be a valid URL"),
  linkToken: z.string().min(1, "Link token is required"),
  status: z.enum(THERAPY_SESSION_STATUSES),
  expiresAt: z.coerce.date().nullable().optional(),
  startTime: z.coerce.date().nullable().optional(),
  endTime: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive().nullable().optional(), // Duration in minutes
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Schema for generating a session link
 * Input: studentId only (SLP is from auth context)
 */
export const generateSessionLinkSchema = z.object({
  studentId: z.uuid("Student ID must be a valid UUID"),
});

/**
 * Response schema for generated session link
 */
export const sessionLinkResponseSchema = z.object({
  sessionId: z.uuid(),
  linkToken: z.string(),
  linkUrl: z.string().url(),
  dailyRoomUrl: z.string().url(),
  slpToken: z.string(), // Daily.co meeting token for SLP
  studentToken: z.string(), // Daily.co meeting token for student
  expiresAt: z.coerce.date().nullable().optional(),
});

/**
 * Update session status schema
 */
export const updateSessionStatusSchema = z.object({
  status: z.enum(THERAPY_SESSION_STATUSES),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  duration: z.number().int().positive().optional(),
});

// Type exports for TypeScript
export type TherapySessionBase = z.infer<typeof therapySessionBaseSchema>;
export type GenerateSessionLink = z.infer<typeof generateSessionLinkSchema>;
export type SessionLinkResponse = z.infer<typeof sessionLinkResponseSchema>;
export type UpdateSessionStatus = z.infer<typeof updateSessionStatusSchema>;
