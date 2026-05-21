import { LevelConfig, WaveConfig } from '../types/index';

const waves: WaveConfig[] = [
  // Wave 1: Fast stream
  {
    time: 1,
    enemyType: 'basic',
    count: 6,
    formation: 'stream',
    spawnY: 150,
    spacing: 40,
    hp: 2,
    speed: 160,
    shootInterval: 1500,
  },
  // Wave 2: Sine swarm
  {
    time: 5,
    enemyType: 'sine',
    count: 6,
    formation: 'line',
    spawnY: 400,
    spacing: 50,
    hp: 2,
    speed: 120,
    shootInterval: 1200,
  },
  // Wave 3: Diagonal assault
  {
    time: 9,
    enemyType: 'diagonal',
    count: 6,
    formation: 'cluster',
    spawnY: 300,
    spacing: 50,
    hp: 2,
    speed: 150,
    shootInterval: 1000,
  },
  // Wave 4: Follow pincer
  {
    time: 13,
    enemyType: 'follow',
    count: 4,
    formation: 'stream',
    spawnY: 100,
    spacing: 150,
    hp: 4,
    speed: 70,
    shootInterval: 800,
  },
  // Wave 5: V-Formation heavy
  {
    time: 18,
    enemyType: 'basic',
    count: 8,
    formation: 'v-shape',
    spawnY: 300,
    spacing: 60,
    hp: 3,
    speed: 140,
    shootInterval: 1000,
  },
  // Wave 6: Sine + Follow mix
  {
    time: 23,
    enemyType: 'sine',
    count: 5,
    formation: 'cluster',
    spawnY: 200,
    spacing: 40,
    hp: 3,
    speed: 130,
    shootInterval: 900,
  },
  {
    time: 24,
    enemyType: 'follow',
    count: 3,
    formation: 'stream',
    spawnY: 450,
    spacing: 100,
    hp: 4,
    speed: 80,
    shootInterval: 700,
  },
  // Wave 7: Dense diagonal
  {
    time: 29,
    enemyType: 'diagonal',
    count: 8,
    formation: 'stream',
    spawnY: 300,
    spacing: 60,
    hp: 3,
    speed: 170,
    shootInterval: 800,
  },
  // Wave 8: Final pre-boss swarm
  {
    time: 34,
    enemyType: 'follow',
    count: 5,
    formation: 'cluster',
    spawnY: 300,
    spacing: 80,
    hp: 5,
    speed: 60,
    shootInterval: 600,
  },
];

export const level2: LevelConfig = {
  name: 'SECTOR 2 - NEBULA CORE',
  waves,
  bossTime: 42,
  scrollSpeed: 1.3,
  backgroundColor: 0x110005,
};
