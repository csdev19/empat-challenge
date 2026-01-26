import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { Button } from "@empat-challenge/web-ui";
import { useValidateSessionLink } from "@/hooks/use-session-link";
import Loader from "@/components/loader";
import { AlertCircle, Video } from "lucide-react";

interface StudentSessionViewProps {
  linkToken: string;
}

export function StudentSessionView({ linkToken }: StudentSessionViewProps) {
  const { data: sessionInfo, isLoading, error } = useValidateSessionLink(linkToken);
  const [isJoining, setIsJoining] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionInfo || !videoContainerRef.current) return;

    // Initialize Daily.co iframe
    // Note: Install @daily-co/daily-js package: bun add @daily-co/daily-js
    const initializeDaily = async () => {
      try {
        // Dynamic import to handle case where package might not be installed yet
        const DailyIframe = await import("@daily-co/daily-js").catch(() => null);

        if (!DailyIframe) {
          console.warn("Daily.co SDK not installed. Install with: bun add @daily-co/daily-js");
          return;
        }

        setIsJoining(true);

        const callFrame = DailyIframe.default.createFrame(videoContainerRef.current!, {
          url: sessionInfo.dailyRoomUrl,
          token: sessionInfo.studentToken,
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

        // Listen for events
        callFrame.on("joined-meeting", () => {
          console.log("Student joined meeting");
        });

        callFrame.on("left-meeting", () => {
          console.log("Student left meeting");
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

    // Cleanup on unmount
    return () => {
      if (callFrameRef.current) {
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
          </CardHeader>
        </Card>

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
              className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center"
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
      </div>
    </div>
  );
}
