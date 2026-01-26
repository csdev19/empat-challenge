/**
 * Phaser game configuration for Word-Picture Match
 */

import type { Types } from "phaser";

// This function creates the config dynamically to avoid importing Phaser at module level
export function createGameConfig(Phaser: any): Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#f0f0f0",
    parent: "game-container",
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}

// Export a getter function for backward compatibility
export const gameConfig = new Proxy({} as Types.Core.GameConfig, {
  get() {
    throw new Error(
      "gameConfig must be created using createGameConfig() with Phaser instance. This prevents SSR errors.",
    );
  },
});
