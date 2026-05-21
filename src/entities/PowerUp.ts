import { Entity } from './Entity';
import { PowerUpType } from '../types/index';
import { COLORS } from '../utils/constants';

export class PowerUp extends Entity {
  public powerUpType: PowerUpType = 'spread';
  private bobTimer = 0;
  private baseY = 0;

  constructor() {
    super();
    this.width = 16;
    this.height = 16;
  }

  init(x: number, y: number, type: PowerUpType): void {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.powerUpType = type;
    this.vx = -80;
    this.bobTimer = 0;
    this.activate();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();

    let color: number;
    let letter: string;
    switch (this.powerUpType) {
      case 'spread':
        color = COLORS.powerupSpread;
        letter = 'S';
        break;
      case 'laser':
        color = COLORS.powerupLaser;
        letter = 'L';
        break;
      case 'missile':
        color = COLORS.powerupMissile;
        letter = 'M';
        break;
      case 'speed':
        color = COLORS.powerupSpeed;
        letter = 'P';
        break;
      case 'shield':
        color = COLORS.powerupShield;
        letter = 'H';
        break;
    }

    // Outer box
    this.graphics
      .roundRect(-8, -8, 16, 16, 3)
      .fill({ color });

    // Inner darker box
    this.graphics
      .roundRect(-6, -6, 12, 12, 2)
      .fill({ color: 0x000000 });

    // Letter indicator (drawn as simple shape - P for power, etc.)
    // Use a small colored dot as the letter indicator
    this.graphics
      .circle(0, 0, 3)
      .fill({ color });

    // We can't easily draw text with Graphics, so we use the void variable
    void letter;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.bobTimer += dt * 4;
    this.y = this.baseY + Math.sin(this.bobTimer) * 5;
  }

  reset(): void {
    super.reset();
    this.bobTimer = 0;
  }
}
