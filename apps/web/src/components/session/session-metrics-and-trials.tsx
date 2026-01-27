import { useState } from "react";
import { Button } from "@empat-challenge/web-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { Textarea } from "@empat-challenge/web-ui";
import { useSessionRecording } from "@/hooks/use-session-recording";
import { useGameOutputs } from "@/hooks/use-game-output";
import { useCreateTrial, useTrials, useTrialStats } from "@/hooks/use-trial-data";
import { Loader2, TrendingUp, Activity, Target, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface SessionMetricsAndTrialsProps {
  therapySessionId: string;
  showTrialControls?: boolean;
}

export function SessionMetricsAndTrials({
  therapySessionId,
  showTrialControls = false,
}: SessionMetricsAndTrialsProps) {
  const { data: recording, isLoading: recordingLoading } = useSessionRecording(therapySessionId);
  const { data: gameOutputs, isLoading: gamesLoading } = useGameOutputs(therapySessionId);
  const { data: trials, isLoading: trialsLoading } = useTrials(therapySessionId);
  const createTrial = useCreateTrial();
  const stats = useTrialStats(therapySessionId);
  const [notes, setNotes] = useState("");

  const isLoading = recordingLoading || gamesLoading || (showTrialControls && trialsLoading);

  const handleTrial = async (isCorrect: boolean) => {
    try {
      await createTrial.mutateAsync({
        therapySessionId,
        isCorrect,
        notes: notes.trim() || undefined,
      });
      setNotes(""); // Clear notes after submission
      toast.success(isCorrect ? "Correct trial recorded" : "Incorrect trial recorded");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record trial";
      toast.error(errorMessage);
    }
  };

  // Calculate accuracy from recording or stats
  const accuracy = recording?.accuracyPercentage
    ? Number(recording.accuracyPercentage)
    : recording && recording.totalTrials > 0
      ? (recording.correctTrials / recording.totalTrials) * 100
      : stats.total > 0
        ? (stats.correct / stats.total) * 100
        : 0;

  // Use recording data if available, otherwise fall back to stats
  const totalTrials = recording?.totalTrials ?? stats.total;
  const correctTrials = recording?.correctTrials ?? stats.correct;
  const incorrectTrials = recording?.incorrectTrials ?? stats.incorrect;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Metrics & Trials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Metrics & Trials</CardTitle>
        <CardDescription>
          {showTrialControls
            ? "Real-time statistics and trial recording"
            : "Real-time session statistics"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Trials */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{totalTrials}</div>
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

          {/* Correct */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{correctTrials}</div>
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

        {/* Accuracy Breakdown Bar */}
        {totalTrials > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Correct</span>
              <span className="font-medium">{correctTrials}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Incorrect</span>
              <span className="font-medium">{incorrectTrials}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{
                  width: `${(correctTrials / totalTrials) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Trial Recording Controls (only shown if showTrialControls is true) */}
        {showTrialControls && (
          <>
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Record Trial</h3>
              <div className="flex gap-4 mb-4">
                <Button
                  onClick={() => handleTrial(true)}
                  disabled={createTrial.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Correct
                </Button>
                <Button
                  onClick={() => handleTrial(false)}
                  disabled={createTrial.isPending}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Incorrect
                </Button>
              </div>

              {/* Optional Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this trial..."
                  rows={2}
                />
              </div>
            </div>

            {/* Recent Trials */}
            {trials && trials.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-semibold">Recent Trials</label>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {trials
                    .slice(-5)
                    .reverse()
                    .map((trial) => (
                      <div
                        key={trial.id}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          trial.isCorrect
                            ? "bg-green-900/30 text-green-100"
                            : "bg-red-900/30 text-red-100"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {trial.isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          Trial #{trial.trialNumber}
                        </span>
                        {trial.notes && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {trial.notes}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
