import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { useGameOutputs } from "@/hooks/use-game-output";
import { Loader2, Gamepad2, Trophy, Clock } from "lucide-react";

interface GameOutputTrackerProps {
  therapySessionId: string;
}

export function GameOutputTracker({ therapySessionId }: GameOutputTrackerProps) {
  const { data: gameOutputs, isLoading } = useGameOutputs(therapySessionId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gameOutputs || gameOutputs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game Outputs</CardTitle>
          <CardDescription>Game results will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No games completed yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Outputs</CardTitle>
        <CardDescription>
          {gameOutputs.length} game{gameOutputs.length !== 1 ? "s" : ""} completed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {gameOutputs.map((output) => (
            <div
              key={output.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium capitalize">
                      {output.gameType.replace(/-/g, " ")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {output.completedAt
                        ? new Date(output.completedAt).toLocaleTimeString()
                        : "In progress"}
                    </div>
                  </div>
                </div>
                {output.score !== null && (
                  <div className="flex items-center gap-1 text-lg font-bold">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {output.score}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                {output.accuracy !== null && (
                  <div>
                    <div className="text-muted-foreground">Accuracy</div>
                    <div className="font-medium">{Number(output.accuracy).toFixed(1)}%</div>
                  </div>
                )}
                {output.duration !== null && (
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Duration
                    </div>
                    <div className="font-medium">{output.duration}s</div>
                  </div>
                )}
                {output.turnsPlayed !== null && (
                  <div>
                    <div className="text-muted-foreground">Turns</div>
                    <div className="font-medium">{output.turnsPlayed}</div>
                  </div>
                )}
              </div>

              {/* Player Results */}
              {output.playerResults && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  {output.playerResults.slp && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">SLP</div>
                      <div className="text-sm">
                        {output.playerResults.slp.correct !== undefined && (
                          <span>
                            {output.playerResults.slp.correct} correct
                            {output.playerResults.slp.incorrect !== undefined &&
                              `, ${output.playerResults.slp.incorrect} incorrect`}
                          </span>
                        )}
                        {output.playerResults.slp.score !== undefined && (
                          <span className="ml-2 font-medium">
                            Score: {output.playerResults.slp.score}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {output.playerResults.student && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Student</div>
                      <div className="text-sm">
                        {output.playerResults.student.correct !== undefined && (
                          <span>
                            {output.playerResults.student.correct} correct
                            {output.playerResults.student.incorrect !== undefined &&
                              `, ${output.playerResults.student.incorrect} incorrect`}
                          </span>
                        )}
                        {output.playerResults.student.score !== undefined && (
                          <span className="ml-2 font-medium">
                            Score: {output.playerResults.student.score}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
