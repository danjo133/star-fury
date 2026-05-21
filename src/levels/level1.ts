import { LevelConfig, WaveConfig } from '../types/index';

const waves: WaveConfig[] = [
  // Wave 1: Easy intro - basic enemies in a line
  {
    time: 1,
    enemyType: 'basic',
    count: 5,
    formation: 'line',
    spawnY: 300,
    spacing: 50,
    hp: 1,
    speed: 120,
    shootInterval: 0,
  },
  // Wave 2: Sine wave enemies
  {
    time: 5,
    enemyType: 'sine',
    count: 4,
    formation: 'stream',
    spawnY: 200,
    spacing: 60,
    hp: 1,
    speed: 100,
    shootInterval: 0,
  },
  // Wave 3: Basic V-formation that shoots
  {
    time: 9,
    enemyType: 'basic',
    count: 6,
    formation: 'v-shape',
    spawnY: 300,
    spacing: 50,
    hp: 1,
    speed: 130,
    shootInterval: 2000,
  },
  // Wave 4: Mixed cluster
  {
    time: 14,
    enemyType: 'sine',
    count: 6,
    formation: 'cluster',
    spawnY: 250,
    spacing: 40,
    hp: 2,
    speed: 110,
    shootInterval: 1500,
  },
  // Wave 5: Diagonal enemies
  {
    time: 18,
    enemyType: 'diagonal',
    count: 4,
    formation: 'stream',
    spawnY: 150,
    spacing: 80,
    hp: 2,
    speed: 140,
    shootInterval: 1800,
  },
  // Wave 6: Following enemies
  {
    time: 23,
    enemyType: 'follow',
    count: 3,
    formation: 'line',
    spawnY: 400,
    spacing: 100,
    hp: 3,
    speed: 80,
    shootInterval: 1200,
  },
  // Wave 7: Large basic swarm
  {
    time: 28,
    enemyType: 'basic',
    count: 8,
    formation: 'cluster',
    spawnY: 300,
    spacing: 30,
    hp: 1,
    speed: 160,
    shootInterval: 2500,
  },
  // Wave 8: Hard wave before boss
  {
    time: 33,
    enemyType: 'follow',
    count: 4,
    formation: 'stream',
    spawnY: 300,
    spacing: 120,
    hp: 3,
    speed: 90,
    shootInterval: 1000,
  },
];

export const level1: LevelConfig = {
  name: 'SECTOR 1 - ASTEROID BELT',
  waves,
  bossTime: 40,
  scrollSpeed: 1,
  backgroundColor: 0x000011,
};
