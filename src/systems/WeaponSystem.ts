import { Container } from 'pixi.js';
import { Bullet } from '../entities/Bullet';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { PLAYER_BULLET_SPEED, PLAYER_FIRE_RATE, ENEMY_BULLET_SPEED } from '../utils/constants';
import { ObjectPool } from '../utils/ObjectPool';
import { angle } from '../utils/math';

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
    switch (player.weaponType) {
      case 'normal':
        this.firePlayerBullet(player.x + 16, player.y, PLAYER_BULLET_SPEED, 0, 1);
        break;
      case 'spread':
        this.fireSpread(player);
        break;
      case 'laser':
        this.fireLaser(player);
        break;
      case 'missile':
        this.fireMissile(player);
        break;
    }
  }

  private fireSpread(player: Player): void {
    const angles = player.weaponLevel >= 3
      ? [-0.3, -0.15, 0, 0.15, 0.3]
      : player.weaponLevel >= 2
        ? [-0.2, 0, 0.2]
        : [-0.15, 0, 0.15];

    for (const a of angles) {
      const vx = Math.cos(a) * PLAYER_BULLET_SPEED;
      const vy = Math.sin(a) * PLAYER_BULLET_SPEED;
      this.firePlayerBullet(player.x + 16, player.y, vx, vy, 1);
    }
  }

  private fireLaser(player: Player): void {
    const damage = player.weaponLevel;
    this.firePlayerBullet(player.x + 16, player.y, PLAYER_BULLET_SPEED * 1.5, 0, damage, true);
  }

  private fireMissile(player: Player): void {
    const count = player.weaponLevel;
    for (let i = 0; i < count; i++) {
      const offsetY = (i - (count - 1) / 2) * 12;
      this.firePlayerBullet(player.x + 16, player.y + offsetY, PLAYER_BULLET_SPEED * 0.8, 0, 2);
    }
  }

  private firePlayerBullet(x: number, y: number, vx: number, vy: number, damage: number, isLaser = false): void {
    const bullet = this.playerBulletPool.get();
    bullet.init(x, y, vx, vy, 'player', damage, isLaser);
    this.gameContainer.addChild(bullet.container);
  }

  private enemyShoot(enemy: Enemy, player: Player): void {
    const a = angle(enemy.x, enemy.y, player.x, player.y);
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
