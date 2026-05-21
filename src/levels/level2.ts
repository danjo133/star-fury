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
    time: 12,
    enemyType: 'follow',
    count: 4,
    formation: 'stream',
    spawnY: 100,
    spacing: 150,
    hp: 4,
    speed: 90,
    shootInterval: 800,
  },
  // Wave 5: V-Formation heavy
  {
    time: 16,
    enemyType: 'basic',
    count: 8,
    formation: 'v-shape',
    spawnY: 300,
    spacing: 60,
    hp: 3,
    speed: 160,
    shootInterval: 1000,
  },
  // Wave 6: Sine + Follow mix
  {
    time: 20,
    enemyType: 'sine',
    count: 5,
    formation: 'cluster',
    spawnY: 200,
    spacing: 40,
    hp: 3,
    speed: 150,
    shootInterval: 900,
  },
  {
    time: 21,
    enemyType: 'follow',
    count: 3,
    formation: 'stream',
    spawnY: 450,
    spacing: 100,
    hp: 4,
    speed: 100,
    shootInterval: 700,
  },
];

export const level2: LevelConfig = {
  name: 'SECTOR 2 - NEBULA CORE',
  waves,
  bossTime: 30,
  scrollSpeed: 1.3,
  backgroundColor: 0x110005,
};
