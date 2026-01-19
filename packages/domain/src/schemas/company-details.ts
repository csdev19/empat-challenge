import { z } from "zod";

/**
 * Base schema for CompanyDetails
 * Represents additional company information related to a hiring process
 */
export const companyDetailsBaseSchema = z.object({
  id: z.uuid(),
  hiringProcessId: z.uuid(),
  website: z.url("Must be a valid URL").nullable(),
  location: z.string().nullable(),
  benefits: z.string().nullable(),
  contactedVia: z.string().nullable(),
  contactPerson: z.string().nullable(),
  interviewSteps: z.number().int().min(0, "Must be a positive integer").nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * Create schema - fields needed to create company details
 * Note: hiringProcessId comes from URL params, not body
 * All fields are optional
 */
export const createCompanyDetailsSchema = z.object({
  website: z.url("Must be a valid URL").optional(),
  location: z.string().optional(),
  benefits: z.string().optional(),
  contactedVia: z.string().optional(),
  contactPerson: z.string().optional(),
  interviewSteps: z.number().int().min(0, "Must be a positive integer").optional(),
});

/**
 * Update schema - all fields optional for updates
 * Same as create schema (hiringProcessId not included)
 */
export const updateCompanyDetailsSchema = createCompanyDetailsSchema;

// Type exports
export type CompanyDetailsBase = z.infer<typeof companyDetailsBaseSchema>;
export type CreateCompanyDetails = z.infer<typeof createCompanyDetailsSchema>;
export type UpdateCompanyDetails = z.infer<typeof updateCompanyDetailsSchema>;
