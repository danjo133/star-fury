export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const FIXED_TIMESTEP = 1 / 60;
export const MAX_DELTA = 0.25;

export const PLAYER_SPEED = 300;
export const PLAYER_BULLET_SPEED = 600;
export const PLAYER_FIRE_RATE = 150; // ms between shots
export const PLAYER_MAX_HP = 3;
export const PLAYER_INVINCIBILITY_DURATION = 2000; // ms

export const ENEMY_SPEED_MIN = 100;
export const ENEMY_SPEED_MAX = 200;
export const ENEMY_BULLET_SPEED = 300;

export const POOL_BULLETS = 50;
export const POOL_ENEMY_BULLETS = 80;
export const POOL_PARTICLES = 200;
export const POOL_ENEMIES = 30;

export const SCORE_BASIC = 10;
export const SCORE_SINE = 25;
export const SCORE_FOLLOW = 50;
export const SCORE_BOSS = 1000;

export const CHAIN_TIMEOUT = 1000; // ms to keep combo
export const CHAIN_MAX_MULTIPLIER = 8;

export const POWERUP_DROP_CHANCE = 0.2;

export const COLORS = {
  player: 0x00ffff,
  playerEngine: 0x4488ff,
  enemyBasic: 0xff4444,
  enemySine: 0xff8800,
  enemyFollow: 0xff00ff,
  enemyDiagonal: 0xffff00,
  bullet: 0xffff00,
  enemyBullet: 0xff6666,
  laser: 0x00aaff,
  missile: 0x00ff00,
  powerupTriple: 0xff0000,
  powerupParallel: 0x00ff00,
  powerupCircle: 0xffff00,
  powerupShield: 0xaa00ff,
  shield: 0x44ccff,
  explosion: 0xff8800,
  star: 0xffffff,
  hud: 0xffffff,
  boss: 0xcc00cc,
  bossCore: 0xff0000,
};
