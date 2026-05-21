import { Container } from 'pixi.js';
import { Enemy } from '../entities/Enemy';
import { WaveConfig } from '../types/index';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { ObjectPool } from '../utils/ObjectPool';
import { randomRange } from '../utils/math';

export class SpawnSystem {
  private waves: WaveConfig[] = [];
  private currentWaveIndex = 0;
  private elapsed = 0;
  private waveSpawnedFlags: boolean[] = [];
  private bossTime = 999;
  public allWavesComplete = false;

  // Track enemies per wave for group-kill detection
  private waveEnemies: Map<number, Set<Enemy>> = new Map();
  private completedWaves: Set<number> = new Set();
  private _lastCompletedWaveCenter: { x: number; y: number } | null = null;

  constructor(private enemyPool: ObjectPool<Enemy>, private gameContainer: Container) {}

  /** Returns the center position of the last completed wave group, or null */
  get lastCompletedWaveCenter(): { x: number; y: number } | null {
    const result = this._lastCompletedWaveCenter;
    this._lastCompletedWaveCenter = null;
    return result;
  }

  loadWaves(waves: WaveConfig[], bossTime = 999): void {
    this.waves = waves;
    this.currentWaveIndex = 0;
    this.elapsed = 0;
    this.waveSpawnedFlags = new Array(waves.length).fill(false);
    this.allWavesComplete = false;
    this.bossTime = bossTime;
    this.waveEnemies.clear();
    this.completedWaves.clear();
    this._lastCompletedWaveCenter = null;
  }

  /** Called when an enemy is killed - checks if its wave group is fully eliminated */
  notifyEnemyKilled(enemy: Enemy): boolean {
    for (const [waveIdx, enemies] of this.waveEnemies.entries()) {
      if (enemies.has(enemy)) {
        enemies.delete(enemy);
        // Check if entire wave is dead (all killed, none left active)
        if (enemies.size === 0 && !this.completedWaves.has(waveIdx)) {
          this.completedWaves.add(waveIdx);
          this._lastCompletedWaveCenter = { x: enemy.x, y: enemy.y };
          return true; // Wave group eliminated!
        }
        return false;
      }
    }
    return false;
  }

  /** Called when an enemy leaves the screen without being killed */
  notifyEnemyLeft(enemy: Enemy): void {
    for (const [, enemies] of this.waveEnemies.entries()) {
      enemies.delete(enemy);
    }
  }

  update(dt: number): void {
    this.elapsed += dt;

    // Check which waves should spawn
    for (let i = 0; i < this.waves.length; i++) {
      if (this.waveSpawnedFlags[i]) continue;
      const wave = this.waves[i];
      if (this.elapsed >= wave.time) {
        this.spawnWave(wave, i);
        this.waveSpawnedFlags[i] = true;
        this.currentWaveIndex = i + 1;
      }
    }

    // Check if all waves spawned and all enemies dead, or bossTime reached
    if (this.currentWaveIndex >= this.waves.length &&
        (this.enemyPool.activeCount === 0 || this.elapsed >= this.bossTime)) {
      this.allWavesComplete = true;
    }
  }

  private spawnWave(wave: WaveConfig, waveIndex: number): void {
    const { enemyType, count, formation, spawnY, spacing = 40, hp = 1, speed = 150, shootInterval = 0 } = wave;
    const waveSet = new Set<Enemy>();

    for (let i = 0; i < count; i++) {
      const enemy = this.enemyPool.get();
      let x: number;
      let y: number;

      switch (formation) {
        case 'line':
          x = GAME_WIDTH + 50 + i * spacing;
          y = spawnY ?? GAME_HEIGHT / 2;
          break;
        case 'v-shape': {
          const centerY = spawnY ?? GAME_HEIGHT / 2;
          const row = Math.floor(i / 2);
          const side = i % 2 === 0 ? -1 : 1;
          x = GAME_WIDTH + 50 + row * spacing;
          y = centerY + side * (row + 1) * 30;
          break;
        }
        case 'cluster':
          x = GAME_WIDTH + 50 + randomRange(0, spacing * 2);
          y = (spawnY ?? GAME_HEIGHT / 2) + randomRange(-60, 60);
          break;
        case 'stream':
          x = GAME_WIDTH + 50 + i * (spacing * 0.6);
          y = spawnY ?? randomRange(50, GAME_HEIGHT - 50);
          break;
      }

      enemy.init(x, y, enemyType, hp, speed, shootInterval);
      this.gameContainer.addChild(enemy.container);
      waveSet.add(enemy);
    }

    this.waveEnemies.set(waveIndex, waveSet);
  }

  reset(): void {
    this.waves = [];
    this.currentWaveIndex = 0;
    this.elapsed = 0;
    this.waveSpawnedFlags = [];
    this.allWavesComplete = false;
    this.waveEnemies.clear();
    this.completedWaves.clear();
    this._lastCompletedWaveCenter = null;
  }

  get progress(): number {
    if (this.waves.length === 0) return 0;
    return this.currentWaveIndex / this.waves.length;
  }
}
