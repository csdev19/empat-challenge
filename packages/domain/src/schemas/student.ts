import { z } from "zod";

/**
 * Base schema for Student
 * Represents the complete domain model with all fields
 */
export const studentBaseSchema = z.object({
  id: z.uuid(),
  userId: z.string().optional().nullable(), // Links to user account (for student profiles)
  name: z.string().min(1, "Name is required"),
  age: z.number().int().positive().optional(),
  inactive: z.coerce.date().nullable().optional(), // null means active
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Create schema for student profile (linked to user account)
 * Fields needed to create a student profile
 */
export const createStudentProfileSchema = studentBaseSchema.pick({
  name: true,
  age: true,
});

/**
 * Create schema - derived from base (for SLP adding students to caseload)
 * Fields needed to create a new student
 */
export const createStudentSchema = studentBaseSchema.pick({
  name: true,
  age: true,
});

/**
 * Update schema for student profile
 */
export const updateStudentProfileSchema = createStudentProfileSchema.partial();

/**
 * Update schema - derived from create (for SLP managing students)
 * Fields that can be updated
 */
export const updateStudentSchema = createStudentSchema.partial();

// Type exports for TypeScript
export type StudentBase = z.infer<typeof studentBaseSchema>;
export type CreateStudent = z.infer<typeof createStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
export type CreateStudentProfile = z.infer<typeof createStudentProfileSchema>;
export type UpdateStudentProfile = z.infer<typeof updateStudentProfileSchema>;
