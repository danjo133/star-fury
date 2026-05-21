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
  public allWavesComplete = false;

  constructor(private enemyPool: ObjectPool<Enemy>, private gameContainer: Container) {}

  loadWaves(waves: WaveConfig[]): void {
    this.waves = waves;
    this.currentWaveIndex = 0;
    this.elapsed = 0;
    this.waveSpawnedFlags = new Array(waves.length).fill(false);
    this.allWavesComplete = false;
  }

  update(dt: number): void {
    this.elapsed += dt;

    // Check which waves should spawn
    for (let i = 0; i < this.waves.length; i++) {
      if (this.waveSpawnedFlags[i]) continue;
      const wave = this.waves[i];
      if (this.elapsed >= wave.time) {
        this.spawnWave(wave);
        this.waveSpawnedFlags[i] = true;
        this.currentWaveIndex = i + 1;
      }
    }

    // Check if all waves spawned and all enemies dead
    if (this.currentWaveIndex >= this.waves.length && this.enemyPool.activeCount === 0) {
      this.allWavesComplete = true;
    }
  }

  private spawnWave(wave: WaveConfig): void {
    const { enemyType, count, formation, spawnY, spacing = 40, hp = 1, speed = 150, shootInterval = 0 } = wave;

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
    }
  }

  reset(): void {
    this.waves = [];
    this.currentWaveIndex = 0;
    this.elapsed = 0;
    this.waveSpawnedFlags = [];
    this.allWavesComplete = false;
  }

  get progress(): number {
    if (this.waves.length === 0) return 0;
    return this.currentWaveIndex / this.waves.length;
  }
}
