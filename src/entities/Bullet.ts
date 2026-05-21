import { Entity } from './Entity';
import { BulletOwner } from '../types/index';
import { COLORS } from '../utils/constants';

export class Bullet extends Entity {
  public owner: BulletOwner = 'player';
  public damage = 1;
  public isLaser = false;

  constructor() {
    super();
    this.width = 8;
    this.height = 4;
  }

  init(x: number, y: number, vx: number, vy: number, owner: BulletOwner, damage = 1, isLaser = false): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
    this.damage = damage;
    this.isLaser = isLaser;
    this.activate();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    if (this.owner === 'player') {
      if (this.isLaser) {
        this.width = 20;
        this.height = 3;
        this.graphics
          .rect(-10, -1.5, 20, 3)
          .fill({ color: COLORS.laser });
        this.graphics
          .rect(-8, -0.5, 16, 1)
          .fill({ color: 0xffffff });
      } else {
        this.width = 8;
        this.height = 4;
        this.graphics
          .rect(-4, -2, 8, 4)
          .fill({ color: COLORS.bullet });
        this.graphics
          .rect(-2, -1, 4, 2)
          .fill({ color: 0xffffff });
      }
    } else {
      this.width = 6;
      this.height = 6;
      this.graphics
        .circle(0, 0, 3)
        .fill({ color: COLORS.enemyBullet });
    }
  }

  reset(): void {
    super.reset();
    this.damage = 1;
    this.isLaser = false;
  }
}
