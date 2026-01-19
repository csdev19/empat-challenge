import { Elysia, t } from "elysia";
import { db } from "@empat-challenge/db/client";
import {
  companyDetailsTable,
  type NewCompanyDetails,
  hiringProcessTable,
} from "@empat-challenge/db/schemas";
import { eq, and, isNull } from "drizzle-orm";
import {
  createCompanyDetailsSchema,
  updateCompanyDetailsSchema,
} from "@empat-challenge/domain/schemas";
import { NotFoundError, ConflictError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { authMacro } from "@/plugins/auth.plugin";

export const companyDetailsRoutes = new Elysia({
  prefix: "/hiring-processes/:id/company-details",
})
  .use(errorHandlerPlugin)
  .use(authMacro)
  // Get company details for interview
  .get(
    "/",
    async ({ params, user }) => {
      // Verify hiring process exists and belongs to user
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) {
        throw new NotFoundError("Hiring process");
      }

      // Get company details (optional - may not exist yet)
      const [result] = await db
        .select()
        .from(companyDetailsTable)
        .where(
          and(
            eq(companyDetailsTable.hiringProcessId, params.id),
            isNull(companyDetailsTable.deletedAt),
          ),
        );

      // Return null if company details don't exist (they're optional)
      if (!result) {
        return successBody(null);
      }

      return successBody(result);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  )
  // Create company details
  .post(
    "/",
    async ({ params, body, status, user }) => {
      // Verify hiring process exists and belongs to user
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) {
        throw new NotFoundError("Hiring process");
      }

      // Check if company details already exist
      const [existing] = await db
        .select()
        .from(companyDetailsTable)
        .where(
          and(
            eq(companyDetailsTable.hiringProcessId, params.id),
            isNull(companyDetailsTable.deletedAt),
          ),
        );

      if (existing) {
        throw new ConflictError("Company details already exist for this hiring process");
      }

      // Generate UUID for new company details
      const id = crypto.randomUUID();

      const newCompanyDetails: NewCompanyDetails = {
        id,
        hiringProcessId: params.id,
        website: body.website,
        location: body.location,
        benefits: body.benefits,
        contactedVia: body.contactedVia,
        contactPerson: body.contactPerson,
        interviewSteps: body.interviewSteps ?? 0,
      };

      const [createdDetails] = await db
        .insert(companyDetailsTable)
        .values(newCompanyDetails)
        .returning();

      return status(201, createdBody(createdDetails));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: createCompanyDetailsSchema,
      isAuth: true,
    },
  )
  // Update company details
  .put(
    "/",
    async ({ params, body, user }) => {
      // Verify hiring process exists and belongs to user
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) {
        throw new NotFoundError("Hiring process");
      }

      // Check if company details exist
      const [existing] = await db
        .select()
        .from(companyDetailsTable)
        .where(
          and(
            eq(companyDetailsTable.hiringProcessId, params.id),
            isNull(companyDetailsTable.deletedAt),
          ),
        );

      if (!existing) {
        throw new NotFoundError("Company details");
      }

      const [updated] = await db
        .update(companyDetailsTable)
        .set({
          website: body.website,
          location: body.location,
          benefits: body.benefits,
          contactedVia: body.contactedVia,
          contactPerson: body.contactPerson,
          interviewSteps: body.interviewSteps,
          updatedAt: new Date(),
        })
        .where(eq(companyDetailsTable.hiringProcessId, params.id))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateCompanyDetailsSchema,
      isAuth: true,
    },
  )
  // Delete company details
  .delete(
    "/",
    async ({ params, status, user }) => {
      // Verify hiring process exists and belongs to user
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) {
        throw new NotFoundError("Hiring process");
      }

      // Check if company details exist
      const [existing] = await db
        .select()
        .from(companyDetailsTable)
        .where(
          and(
            eq(companyDetailsTable.hiringProcessId, params.id),
            isNull(companyDetailsTable.deletedAt),
          ),
        );

      if (!existing) {
        throw new NotFoundError("Company details");
      }

      // Soft delete by setting deletedAt timestamp
      await db
        .update(companyDetailsTable)
        .set({ deletedAt: new Date() })
        .where(eq(companyDetailsTable.hiringProcessId, params.id));

      return status(204);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  );
