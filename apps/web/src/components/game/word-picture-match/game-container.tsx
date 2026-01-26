/**
 * React wrapper component for Word-Picture Match Phaser game
 */

import { useEffect, useRef, useState } from "react";
import { GameWebSocketClient } from "./websocket-client";
import type { GameProps } from "./types";
import { Card, CardContent } from "@empat-challenge/web-ui";
import Loader from "@/components/loader";

export function WordPictureMatchGame({ sessionId, token, role }: GameProps) {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<GameWebSocketClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Don't initialize if not on client
    if (!isClient || typeof window === "undefined") {
      return;
    }

    let mounted = true;

    const initializeGame = async () => {
      try {
        // Dynamically import Phaser and game modules only on client
        // Make Phaser available globally so scene files can access it
        const phaserModule = await import("phaser");
        const Phaser = phaserModule.default || phaserModule;
        
        // Make Phaser available globally BEFORE importing scene files
        if (typeof window !== "undefined") {
          (window as any).Phaser = Phaser;
        }

        // Wait a tick to ensure Phaser is set globally
        await new Promise((resolve) => setTimeout(resolve, 0));

        const [
          { createGameConfig },
          { PreloadScene: PreloadSceneFactory },
          { GameScene: GameSceneFactory },
        ] = await Promise.all([
          import("./game-config"),
          import("./preload-scene"),
          import("./game-scene"),
        ]);

        // Create scene classes now that Phaser is available
        const PreloadScene = PreloadSceneFactory;
        const GameScene = GameSceneFactory;

        const gameConfig = createGameConfig(Phaser);

        // Create WebSocket client
        const wsClient = new GameWebSocketClient(sessionId, token, role);
        wsClientRef.current = wsClient;

        // Connect WebSocket
        await wsClient.connect();

        if (!mounted) {
          wsClient.disconnect();
          return;
        }

        setIsConnecting(false);

        // Create Phaser game
        if (containerRef.current && !gameRef.current) {
          gameRef.current = new Phaser.Game({
            ...gameConfig,
            parent: containerRef.current,
            scene: [PreloadScene, GameScene],
          });

          // Start game scene with WebSocket client
          gameRef.current.scene.start("GameScene", {
            wsClient,
            role,
          });
        }
      } catch (err) {
        console.error("[WordPictureMatchGame] Error initializing game:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize game");
        setIsConnecting(false);
      }
    };

    initializeGame();

    return () => {
      mounted = false;

      // Cleanup
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [sessionId, token, role, isClient]);

  // Don't render anything during SSR
  if (!isClient) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Loader />
            <p className="text-muted-foreground">Loading game...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-destructive font-medium">Error loading game</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Loader />
            <p className="text-muted-foreground">Connecting to game...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Word-Picture Match</h2>
        </div>
        <div
          ref={containerRef}
          id="game-container"
          className="w-full bg-muted rounded-lg overflow-hidden"
          style={{ minHeight: "600px" }}
        />
      </CardContent>
    </Card>
  );
}
