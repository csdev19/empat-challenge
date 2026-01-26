import { z } from "zod";

/**
 * Schema for adding students to caseload
 */
export const addStudentsToCaseloadSchema = z.object({
  studentIds: z.array(z.uuid()).min(1, "At least one student ID is required"),
});

/**
 * Schema for removing a student from caseload
 */
export const removeStudentFromCaseloadSchema = z.object({
  studentId: z.uuid(),
});

// Type exports
export type AddStudentsToCaseload = z.infer<typeof addStudentsToCaseloadSchema>;
export type RemoveStudentFromCaseload = z.infer<typeof removeStudentFromCaseloadSchema>;
