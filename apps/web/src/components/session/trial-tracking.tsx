import { useState } from "react";
import { Button } from "@empat-challenge/web-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { Textarea } from "@empat-challenge/web-ui";
import { useCreateTrial, useTrials, useTrialStats } from "@/hooks/use-trial-data";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TrialTrackingProps {
  therapySessionId: string;
}

export function TrialTracking({ therapySessionId }: TrialTrackingProps) {
  const { data: trials, isLoading } = useTrials(therapySessionId);
  const createTrial = useCreateTrial();
  const stats = useTrialStats(therapySessionId);
  const [notes, setNotes] = useState("");

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trial Tracking</CardTitle>
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
        <CardTitle>Trial Tracking</CardTitle>
        <CardDescription>
          Record correct or incorrect responses during the session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Trials</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.incorrect}</div>
            <div className="text-sm text-muted-foreground">Incorrect</div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="text-center">
          <div className="text-3xl font-bold">
            {stats.accuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Accuracy</div>
        </div>

        {/* Trial Buttons */}
        <div className="flex gap-4">
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

        {/* Recent Trials */}
        {trials && trials.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Recent Trials</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {trials.slice(-5).reverse().map((trial) => (
                <div
                  key={trial.id}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    trial.isCorrect ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {trial.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Trial #{trial.trialNumber}
                  </span>
                  {trial.notes && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {trial.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
