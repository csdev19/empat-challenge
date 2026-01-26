import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@empat-challenge/web-ui";
import { Button } from "@empat-challenge/web-ui";
import { useTherapySession, useStartSession, useEndSession } from "@/hooks/use-therapy-sessions";
import { TrialTracking } from "@/components/session/trial-tracking";
import { BehavioralNotes } from "@/components/session/behavioral-notes";
import { SessionMetrics } from "@/components/session/session-metrics";
import { GameOutputTracker } from "@/components/session/game-output-tracker";
import Loader from "@/components/loader";
import { Video, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

interface SLPSessionViewProps {
  sessionId: string;
}

export function SLPSessionView({ sessionId }: SLPSessionViewProps) {
  const { data: session, isLoading } = useTherapySession(sessionId);
  const startSession = useStartSession();
  const endSession = useEndSession();
  const [isJoining, setIsJoining] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);

  // Initialize Daily.co video call
  useEffect(() => {
    if (!session || !videoContainerRef.current) return;

    const initializeDaily = async () => {
      try {
        // Dynamic import to handle case where package might not be installed yet
        const DailyIframe = await import("@daily-co/daily-js").catch(() => null);

        if (!DailyIframe) {
          console.warn("Daily.co SDK not installed. Install with: bun add @daily-co/daily-js");
          return;
        }

        setIsJoining(true);

        // Regenerate SLP token (tokens can be regenerated as needed)
        // Get room name from dailyRoomUrl or use linkToken
        const roomName = `session-${session.linkToken}`;
        
        // Get SLP token via join-info endpoint (returns SLP token for authenticated SLPs)
        const { clientTreaty } = await import("@/lib/client-treaty");
        
        const joinInfoResult = await clientTreaty.api.v1["therapy-sessions"]({
          id: sessionId,
        })["join-info"].get();
        
        if (joinInfoResult.error || !joinInfoResult.data) {
          throw new Error("Failed to get join information");
        }
        
        const joinInfo = joinInfoResult.data.data as {
          dailyRoomUrl: string;
          studentToken: string;
          slpToken?: string;
        };
        
        if (!joinInfo.slpToken) {
          throw new Error("SLP token not available. Please ensure you are authenticated as the SLP.");
        }
        
        const slpToken = joinInfo.slpToken;

        const callFrame = DailyIframe.default.createFrame(videoContainerRef.current!, {
          url: session.dailyRoomUrl,
          token: slpToken,
          showLeaveButton: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "none",
          },
        });

        callFrameRef.current = callFrame;

        await callFrame.join();
        setIsJoining(false);

        // Auto-start session if scheduled
        if (session.status === THERAPY_SESSION_STATUSES.SCHEDULED) {
          handleStartSession();
        }

        callFrame.on("joined-meeting", () => {
          console.log("SLP joined meeting");
        });

        callFrame.on("left-meeting", () => {
          console.log("SLP left meeting");
        });

        callFrame.on("error", (error: any) => {
          console.error("Daily.co error:", error);
          setIsJoining(false);
        });
      } catch (err) {
        console.error("Failed to initialize Daily.co:", err);
        setIsJoining(false);
      }
    };

    initializeDaily();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.leave().catch(console.error);
      }
    };
  }, [session]);

  const handleStartSession = async () => {
    try {
      await startSession.mutateAsync(sessionId);
      toast.success("Session started");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start session";
      toast.error(errorMessage);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession.mutateAsync({ id: sessionId });
      toast.success("Session ended");
      if (callFrameRef.current) {
        await callFrameRef.current.leave();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to end session";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Video Call */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Video Call</h2>
            </div>
            <div
              ref={videoContainerRef}
              className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center"
            >
              {isJoining && (
                <div className="flex flex-col items-center gap-4">
                  <Loader />
                  <p className="text-muted-foreground">Joining video call...</p>
                </div>
              )}
              {!isJoining && !callFrameRef.current && (
                <div className="flex flex-col items-center gap-4 text-center">
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

        {/* Session Metrics */}
        <SessionMetrics therapySessionId={sessionId} />

        {/* Trial Tracking */}
        {isActive && <TrialTracking therapySessionId={sessionId} />}

        {/* Behavioral Notes */}
        <BehavioralNotes therapySessionId={sessionId} />

        {/* Game Output Tracker */}
        <GameOutputTracker therapySessionId={sessionId} />
      </div>
    </div>
  );
}
