import { Container } from 'pixi.js';

export type EnemyType = 'basic' | 'sine' | 'follow' | 'diagonal';

export type MovementPattern = 'linear' | 'sine' | 'follow' | 'diagonal';

export type PowerUpType = 'triple' | 'parallel' | 'circle' | 'shield';

export type WeaponType = 'normal' | 'triple' | 'parallel' | 'circle';

export type BulletOwner = 'player' | 'enemy';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WaveConfig {
  time: number; // seconds into level when wave spawns
  enemyType: EnemyType;
  count: number;
  formation: 'line' | 'v-shape' | 'cluster' | 'stream';
  spawnY?: number; // specific Y or random if undefined
  spacing?: number;
  hp?: number;
  speed?: number;
  shootInterval?: number; // ms between enemy shots, 0 = no shooting
}

export interface LevelConfig {
  name: string;
  waves: WaveConfig[];
  bossTime: number; // seconds into level when boss spawns (after all waves)
  scrollSpeed: number;
  backgroundColor: number;
}

export interface Scene {
  container: Container;
  enter(): void;
  exit(): void;
  update(dt: number): void;
  resize?(width: number, height: number): void;
}

export type SceneType = 'menu' | 'game' | 'gameover';

export interface ParticleConfig {
  x: number;
  y: number;
  color: number;
  count: number;
  speed: number;
  lifetime: number;
  size: number;
}
