import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { useSessionRecording } from "@/hooks/use-session-recording";
import { useGameOutputs } from "@/hooks/use-game-output";
import { Loader2, TrendingUp, Activity, Target } from "lucide-react";

interface SessionMetricsProps {
  therapySessionId: string;
}

export function SessionMetrics({ therapySessionId }: SessionMetricsProps) {
  const { data: recording, isLoading: recordingLoading } = useSessionRecording(therapySessionId);
  const { data: gameOutputs, isLoading: gamesLoading } = useGameOutputs(therapySessionId);

  if (recordingLoading || gamesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const accuracy = recording?.accuracyPercentage
    ? Number(recording.accuracyPercentage)
    : recording && recording.totalTrials > 0
      ? (recording.correctTrials / recording.totalTrials) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Metrics</CardTitle>
        <CardDescription>Real-time session statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Trials */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{recording?.totalTrials || 0}</div>
            <div className="text-sm text-muted-foreground">Total Trials</div>
          </div>

          {/* Accuracy */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{accuracy.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>

          {/* Correct/Incorrect */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{recording?.correctTrials || 0}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>

          {/* Games Played */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{gameOutputs?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Games Played</div>
          </div>
        </div>

        {/* Breakdown */}
        {recording && recording.totalTrials > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Correct</span>
              <span className="font-medium">{recording.correctTrials}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Incorrect</span>
              <span className="font-medium">{recording.incorrectTrials}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{
                  width: `${(recording.correctTrials / recording.totalTrials) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
