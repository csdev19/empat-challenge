/**
 * Preload scene for loading game assets
 */

// Get Phaser from global scope (set by game-container before importing this module)
const getPhaser = () => {
  if (typeof window === "undefined") {
    throw new Error("Phaser must be available globally");
  }
  const Phaser = (window as any).Phaser;
  if (!Phaser) {
    throw new Error("Phaser must be available globally before importing PreloadScene");
  }
  return Phaser;
};

// Create scene class dynamically using Phaser
export function createPreloadScene() {
  const Phaser = getPhaser();
  
  class PreloadScene extends Phaser.Scene {
    constructor() {
      super({ key: "PreloadScene" });
    }

    preload(): void {
      // Create a simple card back texture (we'll use a colored rectangle for now)
      // In production, load actual card images
      this.load.image("card-back", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

      // For now, we'll render cards using Phaser graphics
      // In production, load actual card images from the imageUrl in card data
    }

    create(): void {
      // Move to main game scene
      this.scene.start("GameScene");
    }
  }

  return PreloadScene;
}

// Export a getter that creates the scene class
export const PreloadScene = createPreloadScene();
