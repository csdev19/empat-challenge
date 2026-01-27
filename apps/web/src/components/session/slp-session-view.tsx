/**
 * SLP Session View Component
 *
 * Features:
 * - Video call via Daily.co WebRTC
 * - Session management (start/end)
 * - Real-time metrics and trial tracking
 * - Behavioral notes
 * - Game output tracking
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@empat-challenge/web-ui";
import { Button } from "@empat-challenge/web-ui";
import { useTherapySession, useStartSession, useEndSession } from "@/hooks/use-therapy-sessions";
import { SessionMetricsAndTrials } from "@/components/session/session-metrics-and-trials";
import { BehavioralNotes } from "@/components/session/behavioral-notes";
import { GameOutputTracker } from "@/components/session/game-output-tracker";
import { WordPictureMatchGame } from "@/components/game/word-picture-match/game-container";
import { HelloWorldGame } from "@/components/game/hello-world-game";
import Loader from "@/components/loader";
import { Video, Play, Square, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";
import { DailyProvider, useCallFrame, useDailyEvent } from "@daily-co/daily-react";
import { getErrorMessage } from "@/lib/error";
import { useUserRole } from "@/hooks/use-user-role";

interface SLPSessionViewProps {
  sessionId: string;
}

// Inner component that uses Daily hooks (must be inside DailyProvider)
function SLPSessionViewContent({
  sessionId,
  session,
  isStudent,
}: {
  sessionId: string;
  session: NonNullable<ReturnType<typeof useTherapySession>["data"]>;
  isStudent: boolean;
}) {
  const startSession = useStartSession();
  const endSession = useEndSession();

  // Video call state
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [slpToken, setSlpToken] = useState<string | null>(null);
  const [studentToken, setStudentToken] = useState<string | null>(null);
  const [dailyRoomUrl, setDailyRoomUrl] = useState<string | null>(null);

  // Use appropriate token based on user role
  const videoToken = isStudent ? studentToken : slpToken;

  // Get call frame using Daily React hook
  // URL and token are passed to join() method, not in options
  const callFrame = useCallFrame({
    parentElRef: videoContainerRef,
    options: {
      showLeaveButton: true,
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "none",
      },
    },
    shouldCreateInstance: () => !!videoToken && !!dailyRoomUrl,
  });

  // Fetch join info (SLP token and room URL)
  useEffect(() => {
    if (!session) return;

    const fetchJoinInfo = async () => {
      try {
        console.log("[SLPSessionView] Fetching join info", { sessionId });
        const { clientTreaty } = await import("@/lib/client-treaty");

        const joinInfoResult = await clientTreaty.api.v1["therapy-sessions"]({
          id: sessionId,
        })["join-info"].get();

        // Check for treaty-level errors (network, etc.)
        if (joinInfoResult.error) {
          console.error("[SLPSessionView] Treaty error:", joinInfoResult.error);
          throw new Error(getErrorMessage(joinInfoResult.error));
        }

        // Check if data exists
        if (!joinInfoResult.data) {
          console.error("[SLPSessionView] No data in response");
          throw new Error("No data returned from server");
        }

        // Extract error and data from API response
        // Response structure: { data: T, error: null } or { data: null, error: { message: string } }
        const { error, data } = joinInfoResult.data;

        // Check if API returned an error
        if (error) {
          console.error("[SLPSessionView] API error:", error);
          throw new Error(error.message || "Failed to get join information");
        }

        // Extract the actual join info data
        const joinInfo = data as {
          dailyRoomUrl: string;
          studentToken: string;
          slpToken?: string;
        };

        if (!joinInfo) {
          console.error("[SLPSessionView] No join info in data");
          throw new Error("Invalid response format");
        }

        console.log("[SLPSessionView] Join info extracted", {
          hasSlpToken: !!joinInfo.slpToken,
          hasStudentToken: !!joinInfo.studentToken,
          roomUrl: joinInfo.dailyRoomUrl,
          isStudent,
          joinInfoKeys: Object.keys(joinInfo),
        });

        // Set appropriate token based on user role
        if (isStudent) {
          if (!joinInfo.studentToken) {
            console.error("[SLPSessionView] Student token missing", {
              joinInfo,
              sessionId,
            });
            throw new Error(
              "Student token not available. Please ensure you have access to this session.",
            );
          }
          setStudentToken(joinInfo.studentToken);
        } else {
          if (!joinInfo.slpToken) {
            console.error("[SLPSessionView] SLP token missing", {
              joinInfo,
              sessionId,
              sessionSlpId: session.slpId,
            });
            throw new Error(
              "SLP token not available. Please ensure you are authenticated as the SLP and that this session belongs to you.",
            );
          }
          setSlpToken(joinInfo.slpToken);
        }

        setDailyRoomUrl(joinInfo.dailyRoomUrl || session.dailyRoomUrl);
      } catch (err) {
        console.error("[SLPSessionView] Failed to fetch join info:", err);
        setJoinError(err instanceof Error ? err.message : "Failed to get join information");
      }
    };

    fetchJoinInfo();
  }, [session, sessionId, isStudent]);

  // Track if we've already attempted to auto-start to prevent infinite loops
  const hasAutoStartedRef = useRef(false);
  const hasJoinedRef = useRef(false);

  const handleStartSession = useCallback(async () => {
    // Prevent multiple start attempts
    if (hasAutoStartedRef.current) {
      console.log("[SLPSessionView] Already attempted to start session, skipping");
      return;
    }

    // Don't start if already active
    if (session.status === THERAPY_SESSION_STATUSES.ACTIVE) {
      console.log("[SLPSessionView] Session already active, skipping start");
      return;
    }

    try {
      hasAutoStartedRef.current = true;
      await startSession.mutateAsync(sessionId);
      toast.success("Session started");
    } catch (err) {
      // Reset on error so user can retry
      hasAutoStartedRef.current = false;
      const errorMessage = err instanceof Error ? err.message : "Failed to start session";
      toast.error(errorMessage);
    }
  }, [startSession, sessionId, session.status]);

  // Join the call when callFrame is ready and we have token/URL
  useEffect(() => {
    if (!callFrame || !videoToken || !dailyRoomUrl || hasJoinedRef.current) {
      return;
    }

    const joinCall = async () => {
      try {
        // Check current meeting state
        const meetingState = callFrame.meetingState();
        if (meetingState === "joined-meeting") {
          console.log("[SLPSessionView] Already joined");
          setIsJoining(false);
          hasJoinedRef.current = true;
          return;
        }

        console.log("[SLPSessionView] Joining Daily.co call", {
          roomUrl: dailyRoomUrl,
          hasToken: !!videoToken,
          isStudent,
          currentState: meetingState,
        });

        setIsJoining(true);
        setJoinError(null);

        // Join with URL and token
        await callFrame.join({
          url: dailyRoomUrl,
          token: videoToken,
        });

        console.log("[SLPSessionView] Successfully joined Daily.co call");
        setIsJoining(false);
        hasJoinedRef.current = true;

        // Auto-start session if scheduled and we haven't already tried (only for SLP)
        if (
          !isStudent &&
          session.status === THERAPY_SESSION_STATUSES.SCHEDULED &&
          !hasAutoStartedRef.current
        ) {
          console.log("[SLPSessionView] Auto-starting scheduled session");
          handleStartSession();
        }
      } catch (err) {
        console.error("[SLPSessionView] Failed to join call:", err);
        setJoinError(err instanceof Error ? err.message : "Failed to join video call");
        setIsJoining(false);
        hasJoinedRef.current = false; // Allow retry on error
      }
    };

    joinCall();
    // Only depend on callFrame, videoToken, and dailyRoomUrl - not session.status or handleStartSession
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callFrame, videoToken, dailyRoomUrl]);

  // Handle Daily events
  useDailyEvent("joined-meeting", () => {
    console.log("[SLPSessionView] SLP joined meeting");
    setIsJoining(false);
  });

  useDailyEvent("left-meeting", () => {
    console.log("[SLPSessionView] SLP left meeting");
  });

  useDailyEvent("error", (ev) => {
    console.error("[SLPSessionView] Daily.co error:", ev);
    const errorEvent = ev as { errorMsg?: string; message?: string };
    setJoinError(errorEvent?.errorMsg || errorEvent?.message || "An error occurred in the video call");
    setIsJoining(false);
  });

  const handleEndSession = async () => {
    try {
      await endSession.mutateAsync({ id: sessionId });
      toast.success("Session ended");
      if (callFrame) {
        await callFrame.leave();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to end session";
      toast.error(errorMessage);
    }
  };

  const isActive = session.status === THERAPY_SESSION_STATUSES.ACTIVE;
  const isCompleted = session.status === THERAPY_SESSION_STATUSES.COMPLETED;

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Session Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Therapy Session</h1>
              <p className="text-muted-foreground">
                Status: <span className="capitalize">{session.status}</span>
              </p>
            </div>
            {/* Only show session controls for SLP */}
            {!isStudent && (
              <div className="flex gap-2">
                {!isActive && !isCompleted && (
                  <Button onClick={handleStartSession} disabled={startSession.isPending}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                )}
                {isActive && (
                  <Button
                    onClick={handleEndSession}
                    disabled={endSession.isPending}
                    variant="destructive"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Video Call */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Video Call</h2>
            </div>
            <div
              ref={videoContainerRef}
              className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center relative"
            >
              {isJoining && (
                <div className="flex flex-col items-center gap-4 absolute z-10">
                  <Loader />
                  <p className="text-muted-foreground">Joining video call...</p>
                </div>
              )}
              {joinError && (
                <div className="flex flex-col items-center gap-4 text-center absolute z-10 bg-background/80 p-4 rounded-lg">
                  <Video className="h-12 w-12 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Failed to join video call</p>
                    <p className="text-sm text-muted-foreground mt-2">{joinError}</p>
                    <Button
                      onClick={() => {
                        setJoinError(null);
                        setIsJoining(true);
                        if (callFrame && videoToken && dailyRoomUrl) {
                          callFrame
                            .join({ url: dailyRoomUrl, token: videoToken })
                            .catch(console.error);
                        }
                      }}
                      className="mt-4"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
              {!isJoining && !joinError && !callFrame && (
                <div className="flex flex-col items-center gap-4 text-center absolute z-10">
                  <Video className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Video call will start automatically</p>
                    <p className="text-sm text-muted-foreground">
                      If the video doesn't appear, please refresh the page
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hello World WebSocket Test */}
        <Card>
          <CardContent className="pt-6">
            <HelloWorldGame />
          </CardContent>
        </Card>

        {/* Word-Picture Match Game - TEMPORARILY HIDDEN */}
        {false && isActive && (
          <WordPictureMatchGame
            sessionId={sessionId}
            token="cookie"
            role={isStudent ? "student" : "slp"}
          />
        )}

        {/* Session Metrics & Trials - Only visible to SLP */}
        {!isStudent && (
          <SessionMetricsAndTrials
            therapySessionId={sessionId}
            showTrialControls={isActive}
          />
        )}

        {/* Behavioral Notes - Only visible to SLP */}
        {!isStudent && <BehavioralNotes therapySessionId={sessionId} />}

        {/* Game Output Tracker */}
        <GameOutputTracker therapySessionId={sessionId} />
      </div>
    </div>
  );
}

// Main component that wraps content in DailyProvider
export function SLPSessionView({ sessionId }: SLPSessionViewProps) {
  const { data: session, isLoading } = useTherapySession(sessionId);

  // NOTE: useUserRole() calls both useSLP() and useStudentProfile() to determine role.
  // This means students will trigger a call to /api/v1/slp which returns 404.
  // This is expected behavior - the 404 is handled gracefully and used to determine the user is not an SLP.
  const { role, isLoading: roleLoading } = useUserRole();

  const isStudent = role === "student";

  if (isLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Session not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DailyProvider>
      <SLPSessionViewContent sessionId={sessionId} session={session} isStudent={isStudent} />
    </DailyProvider>
  );
}
