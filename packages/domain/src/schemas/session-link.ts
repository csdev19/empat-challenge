import { z } from "zod";
import { THERAPY_SESSION_STATUSES } from "../constants";

/**
 * Schema for validating a session link
 * Input: linkToken (from URL path)
 */
export const validateSessionLinkSchema = z.object({
  linkToken: z.string().min(1, "Link token is required"),
});

/**
 * Response schema for session link validation
 */
export const sessionLinkValidationResponseSchema = z.object({
  sessionId: z.uuid(),
  studentId: z.uuid(),
  studentName: z.string(),
  slpId: z.uuid(),
  slpName: z.string(),
  dailyRoomUrl: z.string().url(),
  studentToken: z.string(),
  status: z.enum(THERAPY_SESSION_STATUSES),
  expiresAt: z.coerce.date().nullable().optional(),
});

// Type exports for TypeScript
export type ValidateSessionLink = z.infer<typeof validateSessionLinkSchema>;
export type SessionLinkValidationResponse = z.infer<typeof sessionLinkValidationResponseSchema>;
