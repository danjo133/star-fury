import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { PowerUp } from '../entities/PowerUp';
import { Bounds } from '../types/index';
import { ObjectPool } from '../utils/ObjectPool';

export interface CollisionEvent {
  type: 'enemy_hit' | 'player_hit' | 'boss_hit' | 'powerup_collected' | 'enemy_contact';
  enemy?: Enemy;
  bullet?: Bullet;
  powerUp?: PowerUp;
  damage?: number;
  x: number;
  y: number;
}

function aabb(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export class CollisionSystem {
  checkCollisions(
    player: Player,
    enemies: ObjectPool<Enemy>,
    playerBullets: ObjectPool<Bullet>,
    enemyBullets: ObjectPool<Bullet>,
    powerUps: ObjectPool<PowerUp>,
    boss: Boss | null
  ): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    const playerBounds = player.bounds;

    // Player bullets vs enemies
    const bulletsToRelease: Bullet[] = [];
    const enemiesToRelease: Enemy[] = [];

    for (const bullet of playerBullets.active) {
      const bulletBounds = bullet.bounds;

      // Check against enemies
      for (const enemy of enemies.active) {
        if (aabb(bulletBounds, enemy.bounds)) {
          const dead = enemy.takeDamage(bullet.damage);
          events.push({
            type: 'enemy_hit',
            enemy,
            bullet,
            damage: bullet.damage,
            x: enemy.x,
            y: enemy.y,
          });
          if (!bullet.isLaser) {
            bulletsToRelease.push(bullet);
          }
          if (dead) {
            enemiesToRelease.push(enemy);
          }
          break;
        }
      }

      // Check against boss
      if (boss?.active && !boss.defeated) {
        if (aabb(bulletBounds, boss.bounds)) {
          boss.takeDamage(bullet.damage);
          events.push({
            type: 'boss_hit',
            damage: bullet.damage,
            x: boss.x,
            y: boss.y,
          });
          if (!bullet.isLaser) {
            bulletsToRelease.push(bullet);
          }
        }
      }
    }

    bulletsToRelease.forEach((b) => playerBullets.release(b));
    enemiesToRelease.forEach((e) => enemies.release(e));

    // Enemy bullets vs player
    if (!player.invincible) {
      const enemyBulletsToRelease: Bullet[] = [];
      for (const bullet of enemyBullets.active) {
        if (aabb(bullet.bounds, playerBounds)) {
          events.push({
            type: 'player_hit',
            bullet,
            damage: bullet.damage,
            x: player.x,
            y: player.y,
          });
          enemyBulletsToRelease.push(bullet);
          break; // Only one hit per frame
        }
      }
      enemyBulletsToRelease.forEach((b) => enemyBullets.release(b));

      // Enemy contact vs player
      for (const enemy of enemies.active) {
        if (aabb(enemy.bounds, playerBounds)) {
          events.push({
            type: 'enemy_contact',
            enemy,
            damage: 1,
            x: player.x,
            y: player.y,
          });
          break;
        }
      }

      // Boss contact vs player
      if (boss?.active && !boss.defeated) {
        if (aabb(boss.bounds, playerBounds)) {
          events.push({
            type: 'player_hit',
            damage: 1,
            x: player.x,
            y: player.y,
          });
        }
      }
    }

    // Power-ups vs player
    const powerUpsToRelease: PowerUp[] = [];
    for (const pu of powerUps.active) {
      if (aabb(pu.bounds, playerBounds)) {
        events.push({
          type: 'powerup_collected',
          powerUp: pu,
          x: pu.x,
          y: pu.y,
        });
        powerUpsToRelease.push(pu);
      }
    }
    powerUpsToRelease.forEach((p) => powerUps.release(p));

    return events;
  }
}
