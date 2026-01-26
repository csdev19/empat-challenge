import { pgEnum } from "drizzle-orm/pg-core";
import { THERAPY_SESSION_STATUS_VALUES } from "@empat-challenge/domain/constants";

// Database enum for therapy session status
export const therapySessionStatusEnum = pgEnum(
  "therapy_session_status",
  THERAPY_SESSION_STATUS_VALUES,
);
