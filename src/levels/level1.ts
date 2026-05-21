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
    speed: 150,
    shootInterval: 0,
  },
  // Wave 2: Sine wave enemies
  {
    time: 4,
    enemyType: 'sine',
    count: 4,
    formation: 'stream',
    spawnY: 200,
    spacing: 60,
    hp: 1,
    speed: 130,
    shootInterval: 0,
  },
  // Wave 3: Basic V-formation that shoots
  {
    time: 7,
    enemyType: 'basic',
    count: 6,
    formation: 'v-shape',
    spawnY: 300,
    spacing: 50,
    hp: 1,
    speed: 150,
    shootInterval: 2000,
  },
  // Wave 4: Mixed cluster
  {
    time: 11,
    enemyType: 'sine',
    count: 5,
    formation: 'cluster',
    spawnY: 250,
    spacing: 40,
    hp: 2,
    speed: 140,
    shootInterval: 1500,
  },
  // Wave 5: Diagonal enemies
  {
    time: 14,
    enemyType: 'diagonal',
    count: 4,
    formation: 'stream',
    spawnY: 150,
    spacing: 80,
    hp: 2,
    speed: 160,
    shootInterval: 1800,
  },
  // Wave 6: Following enemies - final wave before boss
  {
    time: 17,
    enemyType: 'follow',
    count: 3,
    formation: 'line',
    spawnY: 400,
    spacing: 100,
    hp: 3,
    speed: 100,
    shootInterval: 1200,
  },
];

export const level1: LevelConfig = {
  name: 'SECTOR 1 - ASTEROID BELT',
  waves,
  bossTime: 25,
  scrollSpeed: 1,
  backgroundColor: 0x000011,
};
