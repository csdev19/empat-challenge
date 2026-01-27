/**
 * Word-Picture Choice Game
 * Simple turn-based educational game using React and WebSocket
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { GameWebSocketClient } from "./websocket-client";
import type { GameProps, GameState, Option } from "./types";
import { Card, CardContent } from "@empat-challenge/web-ui";
import { Button } from "@empat-challenge/web-ui";
import Loader from "@/components/loader";
import { CheckCircle2, XCircle, Loader2, SkipForward } from "lucide-react";

export function WordPictureMatchGame({ sessionId, token, role }: GameProps) {
  const wsClientRef = useRef<GameWebSocketClient | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ correct: boolean; optionId: string } | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const wsClient = new GameWebSocketClient(sessionId, token, role);
    wsClientRef.current = wsClient;

    setIsConnecting(true);
    setConnectionError(null);

    wsClient
      .connect()
      .then(() => {
        console.log("[WordPictureMatchGame] WebSocket connected");
        setIsConnecting(false);
        const initialState = wsClient.getGameState();
        if (initialState) {
          setGameState(initialState);
        }
      })
      .catch((err) => {
        console.error("[WordPictureMatchGame] Connection error:", err);
        setConnectionError(err instanceof Error ? err.message : "Failed to connect");
        setIsConnecting(false);
      });

    // Listen for game state updates
    const unsubGameState = wsClient.onMessage("game-state", (message) => {
      console.log("[WordPictureMatchGame] Game state update:", message.payload);
      setGameState(message.payload as GameState);
      // Clear feedback when game state changes
      setLastFeedback(null);
      setSelectedOptionId(null);
      setIsSubmitting(false);
    });

    // Listen for answer results
    const unsubAnswerResult = wsClient.onMessage("answer-result", (message) => {
      console.log("[WordPictureMatchGame] Answer result:", message.payload);
      const result = message.payload as { optionId: string; correct: boolean };
      setLastFeedback({
        correct: result.correct,
        optionId: result.optionId,
      });
      setIsSubmitting(false);
    });

    // Listen for new prompts
    const unsubNewPrompt = wsClient.onMessage("new-prompt", (message) => {
      console.log("[WordPictureMatchGame] New prompt:", message.payload);
      // Clear previous answer state
      setLastFeedback(null);
      setSelectedOptionId(null);
      setIsSubmitting(false);
    });

    // Listen for game completion
    const unsubCompleted = wsClient.onMessage("game-completed", (message) => {
      console.log("[WordPictureMatchGame] Game completed:", message.payload);
    });

    // Listen for errors
    const unsubError = wsClient.onMessage("error", (message) => {
      console.error("[WordPictureMatchGame] Error:", message.payload);
      setIsSubmitting(false);
    });

    return () => {
      unsubGameState();
      unsubAnswerResult();
      unsubNewPrompt();
      unsubCompleted();
      unsubError();
      wsClient.disconnect();
      wsClientRef.current = null;
    };
  }, [sessionId, token, role]);

  // Handle option selection (student only)
  const handleOptionClick = useCallback(
    (option: Option) => {
      if (!wsClientRef.current || !gameState || isSubmitting) {
        return;
      }

      // Only students can answer
      if (role !== "student") {
        return;
      }

      // Can't answer if game is not active
      if (gameState.status !== "active") {
        return;
      }

      // Can't answer if already answered this prompt
      if (lastFeedback) {
        return;
      }

      setSelectedOptionId(option.id);
      setIsSubmitting(true);

      // Send answer to server
      wsClientRef.current.send({
        type: "select-option",
        payload: {
          optionId: option.id,
        },
        timestamp: new Date().toISOString(),
        player: "student",
      });
    },
    [gameState, role, isSubmitting, lastFeedback],
  );

  // Handle next prompt (SLP only)
  const handleNextPrompt = useCallback(() => {
    if (!wsClientRef.current || !gameState) {
      return;
    }

    // Only SLP can advance
    if (role !== "slp") {
      return;
    }

    wsClientRef.current.send({
      type: "next-prompt",
      payload: {},
      timestamp: new Date().toISOString(),
      player: "slp",
    });
  }, [gameState, role]);

  // Handle end game (SLP only)
  const handleEndGame = useCallback(() => {
    if (!wsClientRef.current || !gameState) {
      return;
    }

    // Only SLP can end game
    if (role !== "slp") {
      return;
    }

    wsClientRef.current.send({
      type: "end-game",
      payload: {},
      timestamp: new Date().toISOString(),
      player: "slp",
    });
  }, [gameState, role]);

  // Loading state
  if (isConnecting) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Word-Picture Choice</h2>
          </div>
          <div className="w-full bg-muted rounded-lg flex flex-col items-center justify-center p-12" style={{ minHeight: "500px" }}>
            <Loader />
            <p className="text-muted-foreground mt-4">Connecting to game server...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (connectionError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Word-Picture Choice</h2>
          </div>
          <div className="w-full bg-muted rounded-lg flex flex-col items-center justify-center p-12" style={{ minHeight: "500px" }}>
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Connection Error</p>
            <p className="text-sm text-muted-foreground text-center mb-4">{connectionError}</p>
            <Button onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Waiting for game state
  if (!gameState) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Word-Picture Choice</h2>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-lg flex flex-col items-center justify-center p-12" style={{ minHeight: "500px" }}>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Waiting for other player to join...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {role === "slp" ? "Waiting for student..." : "Waiting for therapist..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPrompt = gameState.currentPrompt;
  const totalAttempts = gameState.attempts;
  const correctAttempts = gameState.correctAttempts;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const promptProgress = gameState.metadata
    ? `${(gameState.metadata.currentPromptIndex ?? 0) + 1} / ${gameState.metadata.totalPrompts ?? "?"}`
    : "";

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Word-Picture Choice</h2>
            {promptProgress && (
              <p className="text-sm text-muted-foreground">Prompt {promptProgress}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              Score: {correctAttempts}/{totalAttempts}
            </div>
            {totalAttempts > 0 && (
              <div className="text-xs text-muted-foreground">{accuracy}% accuracy</div>
            )}
          </div>
        </div>

        <div className="w-full bg-muted rounded-lg p-6" style={{ minHeight: "500px" }}>
          {/* Waiting State */}
          {gameState.status === "waiting" && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Waiting for game to start...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {role === "slp" ? "Waiting for student to join..." : "Waiting for therapist to start..."}
              </p>
            </div>
          )}

          {/* Active Game State */}
          {gameState.status === "active" && currentPrompt && (
            <div className="space-y-6">
              {/* Word Prompt */}
              <div className="text-center">
                <h3 className="text-4xl font-bold mb-2 tracking-wide">{currentPrompt.word}</h3>
                <p className="text-sm text-muted-foreground">
                  {role === "student" ? "Select the correct picture" : "Student's turn to answer"}
                </p>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {currentPrompt.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const isCorrectAnswer = lastFeedback?.optionId === option.id && lastFeedback.correct;
                  const isIncorrectAnswer = lastFeedback?.optionId === option.id && !lastFeedback.correct;
                  const showCorrectHighlight = lastFeedback && !lastFeedback.correct && option.isCorrect;
                  const isDisabled = isSubmitting || role !== "student" || gameState.status !== "active" || !!lastFeedback;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionClick(option)}
                      disabled={isDisabled}
                      className={`
                        relative aspect-square rounded-xl overflow-hidden border-4 transition-all duration-200
                        ${isSelected && !lastFeedback ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"}
                        ${isCorrectAnswer ? "border-green-500 ring-2 ring-green-500 ring-offset-2" : ""}
                        ${isIncorrectAnswer ? "border-red-500 ring-2 ring-red-500 ring-offset-2" : ""}
                        ${showCorrectHighlight ? "border-green-500 border-dashed" : ""}
                        ${isDisabled && !lastFeedback ? "opacity-60 cursor-not-allowed" : ""}
                        ${!isDisabled ? "hover:border-primary/70 hover:scale-[1.02] cursor-pointer" : ""}
                      `}
                    >
                      <img
                        src={option.imageUrl}
                        alt={`Option`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://via.placeholder.com/300x300/f3f4f6/9ca3af?text=${encodeURIComponent(currentPrompt.word)}`;
                        }}
                      />
                      {/* Correct overlay */}
                      {isCorrectAnswer && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                          <CheckCircle2 className="h-20 w-20 text-green-600 drop-shadow-lg" />
                        </div>
                      )}
                      {/* Incorrect overlay */}
                      {isIncorrectAnswer && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                          <XCircle className="h-20 w-20 text-red-600 drop-shadow-lg" />
                        </div>
                      )}
                      {/* Show correct answer after wrong selection */}
                      {showCorrectHighlight && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                          <CheckCircle2 className="h-16 w-16 text-green-600 drop-shadow-lg" />
                        </div>
                      )}
                      {/* Loading overlay */}
                      {isSubmitting && isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Message */}
              {lastFeedback && (
                <div className="text-center py-4">
                  {lastFeedback.correct ? (
                    <p className="text-xl font-semibold text-green-600">Correct! Great job!</p>
                  ) : (
                    <p className="text-xl font-semibold text-red-600">Not quite. The correct answer is highlighted.</p>
                  )}
                </div>
              )}

              {/* SLP Controls */}
              {role === "slp" && (
                <div className="flex justify-center gap-4 pt-4">
                  <Button
                    onClick={handleNextPrompt}
                    disabled={!lastFeedback}
                    className="gap-2"
                  >
                    <SkipForward className="h-4 w-4" />
                    Next Word
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEndGame}
                  >
                    End Game
                  </Button>
                </div>
              )}

              {/* Student waiting message */}
              {role === "student" && lastFeedback && (
                <div className="text-center text-sm text-muted-foreground">
                  Waiting for therapist to continue...
                </div>
              )}
            </div>
          )}

          {/* Completed State */}
          {gameState.status === "completed" && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <CheckCircle2 className="h-20 w-20 text-green-600 mb-6" />
              <h3 className="text-3xl font-bold mb-2">Game Completed!</h3>
              <p className="text-xl text-muted-foreground mb-6">
                Final Score: {correctAttempts}/{totalAttempts}
              </p>
              {totalAttempts > 0 && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{accuracy}%</div>
                  <p className="text-muted-foreground">Accuracy</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
