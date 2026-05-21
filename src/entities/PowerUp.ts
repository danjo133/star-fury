import { Entity } from './Entity';
import { PowerUpType } from '../types/index';
import { COLORS } from '../utils/constants';
import { SpriteFactory } from '../utils/SpriteFactory';

export class PowerUp extends Entity {
  public powerUpType: PowerUpType = 'triple';
  private bobTimer = 0;
  private baseY = 0;

  constructor() {
    super();
    this.width = 20;
    this.height = 20;
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
    const sprite = SpriteFactory.createSprite(SpriteFactory.powerUp(this.powerUpType), this.width, this.height);
    this.setSprite(sprite);
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
