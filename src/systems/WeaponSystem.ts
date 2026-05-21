import { Container } from 'pixi.js';
import { Bullet } from '../entities/Bullet';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { PLAYER_BULLET_SPEED, PLAYER_FIRE_RATE, ENEMY_BULLET_SPEED } from '../utils/constants';
import { ObjectPool } from '../utils/ObjectPool';
import { angle as calcAngle } from '../utils/math';

export class WeaponSystem {
  private fireCooldown = 0;

  constructor(
    private playerBulletPool: ObjectPool<Bullet>,
    private enemyBulletPool: ObjectPool<Bullet>,
    private gameContainer: Container
  ) {}

  update(dt: number, player: Player, shooting: boolean, enemies: ObjectPool<Enemy>, boss: Boss | null): void {
    // Player shooting
    this.fireCooldown -= dt * 1000;
    if (shooting && this.fireCooldown <= 0) {
      this.playerShoot(player);
      this.fireCooldown = PLAYER_FIRE_RATE;
    }

    // Enemy shooting
    for (const enemy of enemies.active) {
      if (enemy.shouldShoot()) {
        this.enemyShoot(enemy, player);
      }
    }

    // Boss shooting
    if (boss?.active && boss.shouldShoot()) {
      this.bossShoot(boss);
    }
  }

  private playerShoot(player: Player): void {
    for (const weapon of player.activeWeapons) {
      switch (weapon) {
        case 'normal':
          this.firePlayerBullet(player.x + 16, player.y, PLAYER_BULLET_SPEED, 0, 1);
          break;
        case 'triple':
          this.fireTriple(player);
          break;
        case 'parallel':
          this.fireParallel(player);
          break;
        case 'circle':
          this.fireCircle(player);
          break;
      }
    }
  }

  private fireTriple(player: Player): void {
    const angle30 = Math.PI / 6; // 30 degrees
    // Center shot
    this.firePlayerBullet(player.x + 16, player.y, PLAYER_BULLET_SPEED, 0, 1);
    // +30 degrees
    const vxUp = Math.cos(-angle30) * PLAYER_BULLET_SPEED;
    const vyUp = Math.sin(-angle30) * PLAYER_BULLET_SPEED;
    this.firePlayerBullet(player.x + 16, player.y, vxUp, vyUp, 1);
    // -30 degrees
    const vxDown = Math.cos(angle30) * PLAYER_BULLET_SPEED;
    const vyDown = Math.sin(angle30) * PLAYER_BULLET_SPEED;
    this.firePlayerBullet(player.x + 16, player.y, vxDown, vyDown, 1);
  }

  private fireParallel(player: Player): void {
    // Two shots side by side (offset vertically)
    this.firePlayerBullet(player.x + 16, player.y - 8, PLAYER_BULLET_SPEED, 0, 1);
    this.firePlayerBullet(player.x + 16, player.y + 8, PLAYER_BULLET_SPEED, 0, 1);
  }

  private fireCircle(player: Player): void {
    const bulletCount = 8;
    for (let i = 0; i < bulletCount; i++) {
      const a = (i / bulletCount) * Math.PI * 2;
      const vx = Math.cos(a) * PLAYER_BULLET_SPEED * 0.7;
      const vy = Math.sin(a) * PLAYER_BULLET_SPEED * 0.7;
      this.firePlayerBullet(player.x, player.y, vx, vy, 1);
    }
  }

  private firePlayerBullet(x: number, y: number, vx: number, vy: number, damage: number, isLaser = false): void {
    const bullet = this.playerBulletPool.get();
    bullet.init(x, y, vx, vy, 'player', damage, isLaser);
    this.gameContainer.addChild(bullet.container);
  }

  private enemyShoot(enemy: Enemy, player: Player): void {
    const a = calcAngle(enemy.x, enemy.y, player.x, player.y);
    const vx = Math.cos(a) * ENEMY_BULLET_SPEED;
    const vy = Math.sin(a) * ENEMY_BULLET_SPEED;
    const bullet = this.enemyBulletPool.get();
    bullet.init(enemy.x - 12, enemy.y, vx, vy, 'enemy');
    this.gameContainer.addChild(bullet.container);
  }

  private bossShoot(boss: Boss): void {
    const patterns = boss.getShootPatterns();
    for (const p of patterns) {
      const bullet = this.enemyBulletPool.get();
      bullet.init(boss.x - 32, boss.y, p.vx, p.vy, 'enemy', 1);
      this.gameContainer.addChild(bullet.container);
    }
  }

  reset(): void {
    this.fireCooldown = 0;
  }
}
