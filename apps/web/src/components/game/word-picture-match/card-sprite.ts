/**
 * Card sprite component for Word-Picture Match game
 */

import type { CardState } from "@empat-challenge/domain/types";

// Get Phaser from global scope (set by game-container before importing this module)
const getPhaser = () => {
  if (typeof window === "undefined") {
    throw new Error("Phaser must be available globally");
  }
  const Phaser = (window as any).Phaser;
  if (!Phaser) {
    throw new Error("Phaser must be available globally before using CardSprite");
  }
  return Phaser;
};

export class CardSprite {
  private Phaser: any;
  private container: any;
  public cardId: string;
  public cardData: CardState;
  public isFlipped: boolean = false;
  public isMatched: boolean = false;
  public x: number;
  public y: number;

  private cardBack: any;
  private cardFront: any;
  private flipTween: any = null;
  private scene: any;
  private width: number;
  private height: number;

  constructor(
    scene: any,
    x: number,
    y: number,
    width: number,
    height: number,
    cardData: CardState,
  ) {
    this.Phaser = getPhaser();
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.cardId = cardData.id;
    this.cardData = cardData;

    // Create container
    this.container = scene.add.container(x, y);

    // Create card back (colored rectangle)
    this.cardBack = scene.add.rectangle(0, 0, width, height, 0x4a90e2, 1);
    this.cardBack.setStrokeStyle(2, 0xffffff);
    this.container.add(this.cardBack);

    // Create card front
    this.cardFront = scene.add.container(0, 0);
    this.cardFront.setVisible(false);

    // Add content based on card type
    if (cardData.type === "word") {
      // Word card - show text
      const text = scene.add.text(0, 0, cardData.content, {
        fontSize: "32px",
        color: "#000000",
        align: "center",
        wordWrap: { width: width - 20 },
      });
      text.setOrigin(0.5);
      this.cardFront.add(text);
    } else {
      // Picture card - show placeholder (in production, load image)
      const placeholder = scene.add.rectangle(0, 0, width - 20, height - 20, 0xcccccc, 1);
      const imageText = scene.add.text(0, 0, cardData.content, {
        fontSize: "16px",
        color: "#666666",
        align: "center",
        wordWrap: { width: width - 40 },
      });
      imageText.setOrigin(0.5);
      this.cardFront.add([placeholder, imageText]);
    }

    this.container.add(this.cardFront);

    // Make interactive
    this.container.setSize(width, height);
    this.container.setInteractive(
      new this.Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      this.Phaser.Geom.Rectangle.Contains,
    );

    // Set initial state
    this.updateVisualState();
  }

  flip(): void {
    if (this.isFlipped || this.isMatched || this.flipTween) {
      return;
    }

    this.isFlipped = true;
    this.animateFlip();
  }

  flipBack(): void {
    if (!this.isFlipped || this.isMatched || this.flipTween) {
      return;
    }

    this.isFlipped = false;
    this.animateFlip();
  }

  setMatched(): void {
    this.isMatched = true;
    this.isFlipped = true;
    this.updateVisualState();

    // Add glow effect
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 1,
    });
  }

  showMismatch(): void {
    // Shake animation for incorrect match
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x - 10,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.container.x = this.x; // Reset position
      },
    });
  }

  private animateFlip(): void {
    // Scale animation to simulate flip
    this.flipTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 0,
      duration: 150,
      onComplete: () => {
        this.updateVisualState();
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1,
          duration: 150,
          onComplete: () => {
            this.flipTween = null;
          },
        });
      },
    });
  }

  private updateVisualState(): void {
    if (this.isMatched) {
      // Matched cards stay visible
      this.cardBack.setVisible(false);
      this.cardFront.setVisible(true);
      this.container.setAlpha(0.7); // Dim matched cards
    } else if (this.isFlipped) {
      // Show front when flipped
      this.cardBack.setVisible(false);
      this.cardFront.setVisible(true);
      this.container.setAlpha(1);
    } else {
      // Show back when not flipped
      this.cardBack.setVisible(true);
      this.cardFront.setVisible(false);
      this.container.setAlpha(1);
    }
  }

  updateFromState(cardState: CardState): void {
    this.cardData = cardState;
    this.isFlipped = cardState.flipped;
    this.isMatched = cardState.matched;
    this.updateVisualState();
  }

  on(event: string, callback: () => void): void {
    this.container.on(event, callback);
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.container.x - this.width / 2,
      y: this.container.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  destroy(): void {
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
