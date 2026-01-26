import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { Button } from "@empat-challenge/web-ui";
import { useValidateSessionLink } from "@/hooks/use-session-link";
import { WordPictureMatchGame } from "@/components/game/word-picture-match/game-container";
import Loader from "@/components/loader";
import { AlertCircle, Video } from "lucide-react";

interface StudentSessionViewProps {
  linkToken: string;
}

export function StudentSessionView({ linkToken }: StudentSessionViewProps) {
  const { data: sessionInfo, isLoading, error } = useValidateSessionLink(linkToken);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);

  // Log session info when it's loaded
  useEffect(() => {
    if (sessionInfo) {
      console.log("[StudentSessionView] Session info loaded", {
        dailyRoomUrl: sessionInfo.dailyRoomUrl,
        hasToken: !!sessionInfo.studentToken,
        status: sessionInfo.status,
      });
    }
  }, [sessionInfo]);

  useEffect(() => {
    if (!sessionInfo || !videoContainerRef.current) {
      console.log("[StudentSessionView] Waiting for session info or container", {
        hasSessionInfo: !!sessionInfo,
        hasContainer: !!videoContainerRef.current,
      });
      return;
    }

    console.log("[StudentSessionView] Initializing Daily.co", {
      dailyRoomUrl: sessionInfo.dailyRoomUrl,
      hasToken: !!sessionInfo.studentToken,
      status: sessionInfo.status,
    });

    // Initialize Daily.co iframe
    const initializeDaily = async () => {
      try {
        console.log("[StudentSessionView] Importing Daily.co SDK");
        // Dynamic import to handle case where package might not be installed yet
        const DailyIframe = await import("@daily-co/daily-js").catch((err) => {
          console.error("[StudentSessionView] Failed to import Daily.co SDK:", err);
          return null;
        });

        if (!DailyIframe) {
          console.error("[StudentSessionView] Daily.co SDK not available");
          return;
        }

        console.log("[StudentSessionView] Daily.co SDK imported successfully");
        setIsJoining(true);

        console.log("[StudentSessionView] Creating Daily.co frame", {
          url: sessionInfo.dailyRoomUrl,
          tokenLength: sessionInfo.studentToken?.length,
          tokenPreview: sessionInfo.studentToken?.substring(0, 20) + "...",
        });

        if (!sessionInfo.studentToken) {
          console.error("[StudentSessionView] No student token provided");
          setJoinError("No authentication token provided");
          setIsJoining(false);
          return;
        }

        if (!sessionInfo.dailyRoomUrl) {
          console.error("[StudentSessionView] No daily room URL provided");
          setJoinError("No room URL provided");
          setIsJoining(false);
          return;
        }

        // Daily.co SDK: Handle both default export and named export
        const DailyIframeClass = DailyIframe.default || DailyIframe;

        if (!DailyIframeClass || typeof DailyIframeClass.createFrame !== "function") {
          console.error("[StudentSessionView] Daily.co SDK structure unexpected", {
            hasDefault: !!DailyIframe.default,
            hasCreateFrame: !!DailyIframeClass?.createFrame,
            keys: Object.keys(DailyIframe),
          });
          setJoinError("Daily.co SDK not properly loaded");
          setIsJoining(false);
          return;
        }

        const callFrame = DailyIframeClass.createFrame(videoContainerRef.current!, {
          showLeaveButton: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "none",
          },
        });

        callFrameRef.current = callFrame;
        console.log("[StudentSessionView] Daily.co frame created, joining...");

        // Join with URL and token
        try {
          await callFrame.join({
            url: sessionInfo.dailyRoomUrl,
            token: sessionInfo.studentToken,
          });
          console.log("[StudentSessionView] Successfully joined Daily.co room");
          setIsJoining(false);
        } catch (joinErr) {
          console.error("[StudentSessionView] Failed to join room:", joinErr);
          setJoinError(
            joinErr instanceof Error
              ? joinErr.message
              : "Failed to join video call. Please check your connection.",
          );
          setIsJoining(false);
        }

        // Listen for events
        callFrame.on("joined-meeting", () => {
          console.log("[StudentSessionView] Student joined meeting");
          setIsJoining(false);
        });

        callFrame.on("left-meeting", () => {
          console.log("[StudentSessionView] Student left meeting");
        });

        callFrame.on("error", (error: any) => {
          console.error("[StudentSessionView] Daily.co error:", error);
          setJoinError(error?.errorMsg || error?.message || "Failed to join video call");
          setIsJoining(false);
        });

        callFrame.on("load-error", (error: any) => {
          console.error("[StudentSessionView] Daily.co load error:", error);
          setJoinError("Failed to load video call. Please check your connection and try again.");
          setIsJoining(false);
        });

        callFrame.on("participant-joined", (event: any) => {
          console.log("[StudentSessionView] Participant joined:", event);
        });

        callFrame.on("participant-left", (event: any) => {
          console.log("[StudentSessionView] Participant left:", event);
        });
      } catch (err) {
        console.error("[StudentSessionView] Failed to initialize Daily.co:", err);
        setIsJoining(false);
      }
    };

    initializeDaily();

    // Cleanup on unmount
    return () => {
      if (callFrameRef.current) {
        console.log("[StudentSessionView] Cleaning up Daily.co frame");
        callFrameRef.current.leave().catch(console.error);
      }
    };
  }, [sessionInfo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error || !sessionInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Unable to Join Session
            </CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "The session link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your therapist for a new session link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle>Therapy Session</CardTitle>
            <CardDescription>
              Session with {sessionInfo.slpName} - {sessionInfo.studentName}
            </CardDescription>
            <CardDescription className="mt-1">Status: {sessionInfo.status}</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Video Call Container */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Call
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={videoContainerRef}
                className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center relative"
              >
                {isJoining && (
                  <div className="flex flex-col items-center gap-4 absolute z-10">
                    <Loader />
                    <p className="text-muted-foreground">Joining video call...</p>
                  </div>
                )}
                {!isJoining && !callFrameRef.current && !joinError && (
                  <div className="flex flex-col items-center gap-4 text-center absolute z-10">
                    <Video className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Video call will start automatically</p>
                      <p className="text-sm text-muted-foreground">
                        If the video doesn't appear, please refresh the page
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Room: {sessionInfo.dailyRoomUrl}
                      </p>
                    </div>
                  </div>
                )}
                {joinError && (
                  <div className="flex flex-col items-center gap-4 text-center absolute z-10 bg-background/80 p-4 rounded-lg">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Failed to join video call</p>
                      <p className="text-sm text-muted-foreground mt-2">{joinError}</p>
                      <div className="mt-4 space-y-2">
                        <Button
                          onClick={() => {
                            setJoinError(null);
                            setIsJoining(true);
                            // Clean up existing frame
                            if (callFrameRef.current) {
                              callFrameRef.current.leave().catch(console.error);
                              callFrameRef.current.destroy();
                              callFrameRef.current = null;
                            }
                            // Force re-initialization
                            window.location.reload();
                          }}
                          className="w-full"
                        >
                          Retry
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Check browser console (F12) for detailed error messages
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Word-Picture Match Game */}
          {sessionInfo.status === "active" && (
            <WordPictureMatchGame
              sessionId={sessionInfo.sessionId}
              token={linkToken}
              role="student"
            />
          )}
        </div>
      </div>
    </div>
  );
}
