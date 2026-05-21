import { Entity } from './Entity';
import { BulletOwner } from '../types/index';
import { COLORS } from '../utils/constants';
import { SpriteFactory } from '../utils/SpriteFactory';

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
    if (this.owner === 'player') {
      if (this.isLaser) {
        this.width = 20;
        this.height = 3;
        this.graphics.visible = true;
        this.graphics.clear();
        this.graphics
          .rect(-10, -1.5, 20, 3)
          .fill({ color: COLORS.laser });
        this.graphics
          .rect(-8, -0.5, 16, 1)
          .fill({ color: 0xffffff });
        if (this.sprite) { this.sprite.visible = false; }
      } else {
        this.width = 8;
        this.height = 4;
        const sprite = SpriteFactory.createSprite(SpriteFactory.playerBullet(), this.width, this.height);
        this.setSprite(sprite);
      }
    } else {
      this.width = 6;
      this.height = 6;
      const sprite = SpriteFactory.createSprite(SpriteFactory.enemyBullet(), this.width, this.height);
      this.setSprite(sprite);
    }
  }

  reset(): void {
    super.reset();
    this.damage = 1;
    this.isLaser = false;
  }
}
