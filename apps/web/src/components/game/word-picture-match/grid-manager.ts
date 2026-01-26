/**
 * Grid manager for arranging cards in a grid layout
 */

import type { CardState } from "@empat-challenge/domain/types";
import { CardSprite } from "./card-sprite";

// Get Phaser from global scope
const getPhaser = () => {
  if (typeof window === "undefined") {
    throw new Error("Phaser must be available globally");
  }
  const Phaser = (window as any).Phaser;
  if (!Phaser) {
    throw new Error("Phaser must be available globally before using GridManager");
  }
  return Phaser;
};

export class GridManager {
  private cards: CardSprite[] = [];
  private gridWidth: number;
  private gridHeight: number;
  private cardWidth: number;
  private cardHeight: number;
  private cardSpacing: number = 20;

  constructor(
    scene: any,
    width: number,
    height: number,
    cardCount: number,
  ) {
    this.gridWidth = width;
    this.gridHeight = height;

    // Calculate card dimensions based on grid size and card count
    // Aim for a 2x4 or 3x3 grid depending on card count
    const cols = cardCount <= 6 ? 2 : 3;
    const rows = Math.ceil(cardCount / cols);

    const availableWidth = width - (cols + 1) * this.cardSpacing;
    const availableHeight = height - (rows + 1) * this.cardSpacing;

    this.cardWidth = availableWidth / cols;
    this.cardHeight = availableHeight / rows;

    // Ensure cards aren't too small
    const minSize = 100;
    if (this.cardWidth < minSize || this.cardHeight < minSize) {
      const scale = Math.min(
        (width - (cols + 1) * this.cardSpacing) / (cols * minSize),
        (height - (rows + 1) * this.cardSpacing) / (rows * minSize),
      );
      this.cardWidth = minSize * scale;
      this.cardHeight = minSize * scale;
    }
  }

  createCards(scene: any, cardStates: CardState[]): CardSprite[] {
    this.cards = [];

    const cols = cardStates.length <= 6 ? 2 : 3;
    const rows = Math.ceil(cardStates.length / cols);

    const startX = -(this.gridWidth / 2) + this.cardSpacing + this.cardWidth / 2;
    const startY = -(this.gridHeight / 2) + this.cardSpacing + this.cardHeight / 2;

    cardStates.forEach((cardState, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + col * (this.cardWidth + this.cardSpacing);
      const y = startY + row * (this.cardHeight + this.cardSpacing);

      const card = new CardSprite(scene, x, y, this.cardWidth, this.cardHeight, cardState);
      this.cards.push(card);
    });

    return this.cards;
  }

  getCardAt(x: number, y: number): CardSprite | null {
    return (
      this.cards.find((card) => {
        const bounds = card.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
      }) || null
    );
  }

  updateCards(cardStates: CardState[]): void {
    cardStates.forEach((cardState) => {
      const card = this.cards.find((c) => c.cardId === cardState.id);
      if (card) {
        card.updateFromState(cardState);
      }
    });
  }

  getCards(): CardSprite[] {
    return this.cards;
  }
}
