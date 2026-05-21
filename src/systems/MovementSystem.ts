import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { ObjectPool } from '../utils/ObjectPool';

export class MovementSystem {
  update(
    dt: number,
    player: Player,
    enemies: ObjectPool<Enemy>,
    playerBullets: ObjectPool<Bullet>,
    enemyBullets: ObjectPool<Bullet>,
    boss: Boss | null,
    onEnemyLeft?: (enemy: Enemy) => void
  ): void {
    // Update player bullets
    const bulletsToRelease: Bullet[] = [];
    for (const bullet of playerBullets.active) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x > GAME_WIDTH + 20 || bullet.x < -20 ||
          bullet.y > GAME_HEIGHT + 20 || bullet.y < -20) {
        bulletsToRelease.push(bullet);
      }
    }
    bulletsToRelease.forEach((b) => playerBullets.release(b));

    // Update enemy bullets
    const enemyBulletsToRelease: Bullet[] = [];
    for (const bullet of enemyBullets.active) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x > GAME_WIDTH + 20 || bullet.x < -20 ||
          bullet.y > GAME_HEIGHT + 20 || bullet.y < -20) {
        enemyBulletsToRelease.push(bullet);
      }
    }
    enemyBulletsToRelease.forEach((b) => enemyBullets.release(b));

    // Update enemies
    const enemiesToRelease: Enemy[] = [];
    for (const enemy of enemies.active) {
      enemy.update(dt, player.y);
      if (enemy.x < -50) {
        enemiesToRelease.push(enemy);
      }
    }
    enemiesToRelease.forEach((e) => {
      if (onEnemyLeft) onEnemyLeft(e);
      enemies.release(e);
    });

    // Update boss
    if (boss?.active) {
      boss.update(dt, player.y);
    }
  }
}
