import { Entity } from './Entity';
import { EnemyType, MovementPattern } from '../types/index';
import { COLORS, GAME_HEIGHT } from '../utils/constants';
import { randomRange } from '../utils/math';

export class Enemy extends Entity {
  public enemyType: EnemyType = 'basic';
  public pattern: MovementPattern = 'linear';
  public baseY = 0;
  public elapsed = 0;
  public shootTimer = 0;
  public shootInterval = 0; // 0 = no shooting
  public scoreValue = 10;
  public speed = 150;
  private sineAmplitude = 0;
  private sineFrequency = 0;
  public targetY = 0; // for follow pattern

  constructor() {
    super();
    this.width = 24;
    this.height = 20;
  }

  init(
    x: number,
    y: number,
    type: EnemyType,
    hp = 1,
    speed = 150,
    shootInterval = 0
  ): void {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.enemyType = type;
    this.pattern = type as MovementPattern;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.shootInterval = shootInterval;
    this.shootTimer = shootInterval > 0 ? randomRange(0, shootInterval) : 0;
    this.elapsed = 0;

    switch (type) {
      case 'basic':
        this.scoreValue = 10;
        break;
      case 'sine':
        this.scoreValue = 25;
        this.sineAmplitude = randomRange(40, 80);
        this.sineFrequency = randomRange(2, 4);
        break;
      case 'follow':
        this.scoreValue = 50;
        break;
      case 'diagonal':
        this.scoreValue = 25;
        this.vy = (Math.random() > 0.5 ? 1 : -1) * speed * 0.5;
        break;
    }

    this.vx = -speed;
    this.activate();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();

    let color: number;
    switch (this.enemyType) {
      case 'basic':
        color = COLORS.enemyBasic;
        this.drawBasicShip(color);
        break;
      case 'sine':
        color = COLORS.enemySine;
        this.drawSineShip(color);
        break;
      case 'follow':
        color = COLORS.enemyFollow;
        this.drawFollowShip(color);
        break;
      case 'diagonal':
        color = COLORS.enemyDiagonal;
        this.drawDiagonalShip(color);
        break;
    }
  }

  private drawBasicShip(color: number): void {
    this.graphics
      .poly([
        { x: -12, y: 0 },
        { x: 6, y: -8 },
        { x: 12, y: -6 },
        { x: 12, y: 6 },
        { x: 6, y: 8 },
      ])
      .fill({ color });
  }

  private drawSineShip(color: number): void {
    this.graphics
      .poly([
        { x: -10, y: 0 },
        { x: 0, y: -10 },
        { x: 10, y: -6 },
        { x: 10, y: 6 },
        { x: 0, y: 10 },
      ])
      .fill({ color });
    // Wing details
    this.graphics
      .rect(-4, -12, 8, 2)
      .fill({ color });
    this.graphics
      .rect(-4, 10, 8, 2)
      .fill({ color });
  }

  private drawFollowShip(color: number): void {
    this.graphics
      .circle(0, 0, 10)
      .fill({ color });
    this.graphics
      .circle(0, 0, 5)
      .fill({ color: 0x220022 });
    this.graphics
      .circle(-2, 0, 3)
      .fill({ color: 0xff00ff });
  }

  private drawDiagonalShip(color: number): void {
    this.graphics
      .poly([
        { x: -10, y: 0 },
        { x: 0, y: -10 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
      ])
      .fill({ color });
  }

  update(dt: number, playerY: number): void {
    this.elapsed += dt;

    switch (this.pattern) {
      case 'linear':
        this.x += this.vx * dt;
        break;
      case 'sine':
        this.x += this.vx * dt;
        this.y = this.baseY + Math.sin(this.elapsed * this.sineFrequency) * this.sineAmplitude;
        break;
      case 'follow':
        this.x += this.vx * dt;
        this.targetY = playerY;
        const diff = this.targetY - this.y;
        this.y += diff * 2 * dt;
        break;
      case 'diagonal':
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        // Bounce off top/bottom
        if (this.y < 20 || this.y > GAME_HEIGHT - 20) {
          this.vy *= -1;
        }
        break;
    }

    // Shoot timer
    if (this.shootInterval > 0) {
      this.shootTimer -= dt * 1000;
    }
  }

  shouldShoot(): boolean {
    if (this.shootInterval <= 0) return false;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootInterval;
      return true;
    }
    return false;
  }

  reset(): void {
    super.reset();
    this.elapsed = 0;
    this.shootTimer = 0;
    this.vy = 0;
  }
}
