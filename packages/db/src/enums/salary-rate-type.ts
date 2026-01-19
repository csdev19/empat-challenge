import { pgEnum } from "drizzle-orm/pg-core";
import { SALARY_RATE_TYPE_VALUES } from "@empat-challenge/domain/constants";

// Database enum for salary rate type
export const salaryRateTypeEnum = pgEnum("salary_rate_type", SALARY_RATE_TYPE_VALUES);
