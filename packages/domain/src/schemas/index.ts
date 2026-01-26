// Pagination schemas
export { paginationQuerySchema, type PaginationQuery } from "./pagination";

// Student schemas
export {
  studentBaseSchema,
  createStudentSchema,
  updateStudentSchema,
  type StudentBase,
  type CreateStudent,
  type UpdateStudent,
} from "./student";

// SLP schemas
export {
  slpBaseSchema,
  createSLPSchema,
  updateSLPSchema,
  type SLPBase,
  type CreateSLP,
  type UpdateSLP,
} from "./slp";

// Therapy Session schemas
export {
  therapySessionBaseSchema,
  generateSessionLinkSchema,
  sessionLinkResponseSchema,
  updateSessionStatusSchema,
  type TherapySessionBase,
  type GenerateSessionLink,
  type SessionLinkResponse,
  type UpdateSessionStatus,
} from "./therapy-session";

// Trial Data schemas
export {
  trialDataBaseSchema,
  createTrialDataSchema,
  updateTrialDataSchema,
  trialDataBatchSchema,
  type TrialDataBase,
  type CreateTrialData,
  type UpdateTrialData,
  type TrialDataBatch,
} from "./trial-data";

// Session Recording schemas
export {
  sessionRecordingBaseSchema,
  createSessionRecordingSchema,
  updateSessionRecordingSchema,
  sessionRecordingWithTrialsSchema,
  type SessionRecordingBase,
  type CreateSessionRecording,
  type UpdateSessionRecording,
  type SessionRecordingWithTrials,
} from "./session-recording";

// Game Output schemas
export {
  gameOutputBaseSchema,
  createGameOutputSchema,
  updateGameOutputSchema,
  gameOutputPlayerResultsSchema,
  gameOutputEventSchema,
  type GameOutputBase,
  type CreateGameOutput,
  type UpdateGameOutput,
  type GameOutputPlayerResults,
  type GameOutputEvent,
} from "./game-output";

// Session Link schemas
export {
  validateSessionLinkSchema,
  sessionLinkValidationResponseSchema,
  type ValidateSessionLink,
  type SessionLinkValidationResponse,
} from "./session-link";

// Caseload schemas
export {
  addStudentsToCaseloadSchema,
  removeStudentFromCaseloadSchema,
  type AddStudentsToCaseload,
  type RemoveStudentFromCaseload,
} from "./caseload";
