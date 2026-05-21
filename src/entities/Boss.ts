import { Entity } from './Entity';
import { COLORS, GAME_HEIGHT } from '../utils/constants';
import { randomRange } from '../utils/math';
import { SpriteFactory } from '../utils/SpriteFactory';

export type BossPhase = 1 | 2 | 3;

export class Boss extends Entity {
  public phase: BossPhase = 1;
  public bossType: 'level1' | 'level2' = 'level1';
  public shootTimer = 0;
  public phaseTimer = 0;
  public patternTimer = 0;
  public defeated = false;
  public scoreValue = 1000;
  private baseY = 0;
  private moveDir = 1;
  private entering = true;
  private targetX = 0;
  private readyToShoot = false;

  // Level 2 boss segments
  public segments: { x: number; y: number; hp: number }[] = [];

  constructor() {
    super();
    this.width = 96;
    this.height = 72;
  }

  init(type: 'level1' | 'level2'): void {
    this.bossType = type;
    this.phase = 1;
    this.defeated = false;
    this.entering = true;
    this.shootTimer = 0;
    this.phaseTimer = 0;
    this.patternTimer = 0;
    this.readyToShoot = false;
    this.segments = [];

    if (type === 'level1') {
      this.maxHp = 50;
      this.hp = 50;
      this.width = 96;
      this.height = 72;
      this.x = 900;
      this.y = GAME_HEIGHT / 2;
      this.targetX = 650;
      this.baseY = GAME_HEIGHT / 2;
      this.scoreValue = 1000;
    } else {
      this.maxHp = 80;
      this.hp = 80;
      this.width = 60;
      this.height = 60;
      this.x = 900;
      this.y = GAME_HEIGHT / 2;
      this.targetX = 620;
      this.baseY = GAME_HEIGHT / 2;
      this.scoreValue = 2000;
      // Create segments
      for (let i = 0; i < 6; i++) {
        this.segments.push({ x: this.x + (i + 1) * 30, y: this.y, hp: 5 });
      }
    }

    this.activate();
    this.draw();
  }

  private draw(): void {
    if (this.bossType === 'level1') {
      const sprite = SpriteFactory.createSprite(SpriteFactory.bossLevel1(), this.width, this.height);
      this.setSprite(sprite);
    } else {
      const sprite = SpriteFactory.createSprite(SpriteFactory.bossLevel2(), this.width, this.height);
      this.setSprite(sprite);
    }
  }

  update(dt: number, playerY: number): void {
    this.phaseTimer += dt;
    this.patternTimer += dt;

    // Entering animation
    if (this.entering) {
      this.x += (this.targetX - this.x) * 2 * dt;
      if (Math.abs(this.x - this.targetX) < 2) {
        this.entering = false;
        this.x = this.targetX;
      }
      this.updateSegments();
      return;
    }

    // Phase transitions
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.33 && this.phase < 3) {
      this.phase = 3;
      this.draw();
    } else if (hpPercent <= 0.66 && this.phase < 2) {
      this.phase = 2;
      this.draw();
    }

    // Movement
    if (this.bossType === 'level1') {
      this.updateLevel1(dt, playerY);
    } else {
      this.updateLevel2(dt, playerY);
    }

    // Shoot timer
    const shootRate = this.phase === 3 ? 400 : this.phase === 2 ? 600 : 1000;
    this.shootTimer -= dt * 1000;
    if (this.shootTimer <= 0) {
      this.readyToShoot = true;
      this.shootTimer = shootRate;
    }

    this.updateSegments();
  }

  private updateLevel1(dt: number, _playerY: number): void {
    // Move up and down
    this.y += this.moveDir * 100 * (this.phase) * dt;
    if (this.y < 60 || this.y > GAME_HEIGHT - 60) {
      this.moveDir *= -1;
    }

    // Slight X oscillation in later phases
    if (this.phase >= 2) {
      this.x = this.targetX + Math.sin(this.patternTimer * 2) * 20;
    }
    void _playerY;
  }

  private updateLevel2(dt: number, playerY: number): void {
    // Follow player Y with some lag
    const diff = playerY - this.y;
    this.y += diff * (0.5 + this.phase * 0.3) * dt;

    // Weave X
    this.x = this.targetX + Math.sin(this.patternTimer * 1.5) * 30;

    // Update segments to follow head
    void dt;
  }

  private updateSegments(): void {
    if (this.bossType !== 'level2') return;
    let prevX = this.x;
    let prevY = this.y;
    for (const seg of this.segments) {
      const dx = prevX - seg.x;
      const dy = prevY - seg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 30) {
        seg.x += (dx / dist) * (dist - 30);
        seg.y += (dy / dist) * (dist - 30);
      }
      prevX = seg.x;
      prevY = seg.y;
    }
  }

  shouldShoot(): boolean {
    if (this.readyToShoot && !this.entering) {
      this.readyToShoot = false;
      return true;
    }
    return false;
  }

  getShootPatterns(): { vx: number; vy: number }[] {
    const patterns: { vx: number; vy: number }[] = [];

    if (this.bossType === 'level1') {
      switch (this.phase) {
        case 1:
          // 3-way spread
          patterns.push({ vx: -300, vy: 0 });
          patterns.push({ vx: -280, vy: -60 });
          patterns.push({ vx: -280, vy: 60 });
          break;
        case 2:
          // 5-way spread
          patterns.push({ vx: -300, vy: 0 });
          patterns.push({ vx: -280, vy: -80 });
          patterns.push({ vx: -280, vy: 80 });
          patterns.push({ vx: -250, vy: -150 });
          patterns.push({ vx: -250, vy: 150 });
          break;
        case 3:
          // Dense fan + fast center
          patterns.push({ vx: -400, vy: 0 });
          for (let i = -3; i <= 3; i++) {
            patterns.push({ vx: -280, vy: i * 50 });
          }
          break;
      }
    } else {
      // Level 2 boss - aimed shots
      const count = this.phase * 2 + 1;
      for (let i = 0; i < count; i++) {
        const angle = randomRange(-0.6, 0.6);
        patterns.push({
          vx: -320 * Math.cos(angle),
          vy: -320 * Math.sin(angle),
        });
      }
    }

    return patterns;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.defeated = true;
      return true;
    }
    return false;
  }

  reset(): void {
    super.reset();
    this.phase = 1;
    this.defeated = false;
    this.entering = true;
    this.segments = [];
  }
}
