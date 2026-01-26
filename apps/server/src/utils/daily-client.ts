import { getEnv } from "./env";

const env = getEnv();

const DAILY_API_BASE_URL = "https://api.daily.co/v1";

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: "public" | "private";
  config: Record<string, unknown>;
  created_at: string;
}

interface DailyRoomProperties {
  nbf?: number; // not before (Unix timestamp)
  exp?: number; // expiry (Unix timestamp)
  max_participants?: number;
  enable_people_ui?: boolean;
  enable_chat?: boolean;
  enable_prejoin_ui?: boolean;
  [key: string]: unknown;
}

interface CreateRoomOptions {
  name?: string;
  privacy?: "public" | "private";
  properties?: DailyRoomProperties;
}

interface MeetingTokenProperties {
  room_name: string;
  nbf?: number;
  exp?: number;
  is_owner?: boolean;
  user_name?: string;
  start_cloud_recording?: boolean;
  [key: string]: unknown;
}

interface MeetingTokenResponse {
  token: string;
}

/**
 * Create a Daily.co room
 * @param options Room creation options
 * @returns Created room object
 */
export async function createDailyRoom(options: CreateRoomOptions = {}): Promise<DailyRoom> {
  const response = await fetch(`${DAILY_API_BASE_URL}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: options.name,
      privacy: options.privacy || "private",
      properties: options.properties || {},
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Failed to create Daily.co room: ${error.error || response.statusText}`);
  }

  const data = (await response.json()) as DailyRoom;
  return data;
}

/**
 * Generate a Daily.co meeting token
 * @param properties Token properties
 * @returns Meeting token
 */
export async function generateMeetingToken(properties: MeetingTokenProperties): Promise<string> {
  const response = await fetch(`${DAILY_API_BASE_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `Failed to generate Daily.co meeting token: ${error.error || response.statusText}`,
    );
  }

  const data: MeetingTokenResponse = await response.json();
  return data.token;
}

/**
 * Generate meeting tokens for both SLP and student
 * @param roomName Daily.co room name
 * @param slpName SLP display name
 * @param studentName Student display name
 * @param expiresIn Optional expiration time in seconds (default: 24 hours)
 * @returns Object with SLP and student tokens
 */
export async function generateSessionTokens(
  roomName: string,
  slpName: string,
  studentName: string,
  expiresIn: number = 24 * 60 * 60, // 24 hours default
): Promise<{ slpToken: string; studentToken: string }> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const [slpToken, studentToken] = await Promise.all([
    generateMeetingToken({
      room_name: roomName,
      is_owner: true,
      user_name: slpName,
      exp: expiresAt,
    }),
    generateMeetingToken({
      room_name: roomName,
      is_owner: false,
      user_name: studentName,
      exp: expiresAt,
    }),
  ]);

  return { slpToken, studentToken };
}
