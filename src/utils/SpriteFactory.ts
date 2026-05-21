/**
 * Procedural pixel-art sprite factory
 * Generates retro R-Type / Jets'n'Guns style sprites using Canvas textures
 * All sprites are generated at runtime - no external assets needed
 */

import { Texture, Container, Sprite, Graphics } from 'pixi.js';

// Pixel art palette - rich 16-bit era colors
const PALETTE = {
  // Player ship
  playerBody: '#0088cc',
  playerLight: '#44ccff',
  playerDark: '#004488',
  playerCockpit: '#ffcc00',
  playerEngine: '#ff4400',
  playerEngineGlow: '#ffaa00',
  playerWing: '#006699',

  // Enemy: basic (red fighters)
  enemyBasicBody: '#cc2200',
  enemyBasicLight: '#ff6644',
  enemyBasicDark: '#881100',

  // Enemy: sine (orange interceptors)
  enemySineBody: '#cc6600',
  enemySineLight: '#ffaa44',
  enemySineDark: '#884400',

  // Enemy: follow (purple drones)
  enemyFollowBody: '#9900cc',
  enemyFollowLight: '#cc44ff',
  enemyFollowDark: '#660088',
  enemyFollowEye: '#ff00ff',

  // Enemy: diagonal (yellow speeders)
  enemyDiagBody: '#ccaa00',
  enemyDiagLight: '#ffdd44',
  enemyDiagDark: '#886600',

  // Boss
  bossBody: '#880088',
  bossLight: '#cc44cc',
  bossDark: '#440044',
  bossCore: '#ff0000',
  bossCoreGlow: '#ff8800',
  bossArmor: '#660066',

  // Asteroids
  rockBody: '#665544',
  rockLight: '#998877',
  rockDark: '#332211',
  rockCrater: '#443322',

  // Powerups
  puTriple: '#ff2200',
  puParallel: '#00cc44',
  puCircle: '#ffcc00',
  puShield: '#8800ff',
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  ctx.globalAlpha = 1;
}

function drawPixelRow(ctx: CanvasRenderingContext2D, x: number, y: number, pixels: (string | null)[]): void {
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i]) {
      setPixel(ctx, x + i, y, pixels[i]!);
    }
  }
}

/**
 * Draw a sprite from a 2D pixel map (array of rows, each row is array of color strings or null)
 */
function drawPixelMap(ctx: CanvasRenderingContext2D, ox: number, oy: number, map: (string | null)[][]): void {
  for (let y = 0; y < map.length; y++) {
    drawPixelRow(ctx, ox, oy + y, map[y]);
  }
}

// ============================================================
// PLAYER SHIP - Sleek R-Type style fighter (48x30 scaled from 24x15 pixel art)
// ============================================================
function createPlayerTexture(): Texture {
  const W = 24, H = 15;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.playerBody, L = PALETTE.playerLight, D = PALETTE.playerDark;
  const C = PALETTE.playerCockpit, E = PALETTE.playerEngine, G = PALETTE.playerEngineGlow;
  const Wi = PALETTE.playerWing;
  const _ = null;

  // Design: forward-pointing fighter with swept wings
  const map: (string | null)[][] = [
    //0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, Wi,Wi,_, _, _, _, _],  // 0: top wing tip
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, Wi,Wi,Wi,D, _, _, _, _, _],  // 1
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, Wi,Wi,D, D, _, _, _, _, _, _],  // 2: wing connection
    [_, _, _, _, _, _, _, _, _, _, _, _, L, L, B, B, B, D, _, _, _, _, _, _],  // 3: body top
    [_, _, _, _, _, _, _, _, _, _, L, L, L, B, B, B, B, D, D, _, _, _, _, _],  // 4
    [_, _, E, G, _, _, _, _, L, L, L, B, B, B, C, C, B, B, D, D, L, L, L,_],  // 5: cockpit row top
    [_, E, E, G, G, D, D, D, B, B, B, B, B, C, C, B, B, B, B, B, L, L, L, L],// 6: center top
    [_, E, E, G, G, D, D, D, B, B, B, B, B, C, C, B, B, B, B, B, L, L, L, L],// 7: center (nose)
    [_, E, E, G, G, D, D, D, B, B, B, B, B, C, C, B, B, B, B, B, L, L, L, L],// 8: center bottom
    [_, _, E, G, _, _, _, _, D, D, D, B, B, B, C, C, B, B, D, D, L, L, L,_],  // 9: cockpit row bot
    [_, _, _, _, _, _, _, _, _, _, D, D, D, B, B, B, B, D, D, _, _, _, _, _],  // 10
    [_, _, _, _, _, _, _, _, _, _, _, _, D, D, B, B, B, D, _, _, _, _, _, _],  // 11: body bottom
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, Wi,Wi,D, D, _, _, _, _, _, _],  // 12: wing connection
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, Wi,Wi,Wi,D, _, _, _, _, _],  // 13
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, Wi,Wi,_, _, _, _, _],  // 14: bottom wing tip
  ];

  drawPixelMap(ctx, 0, 0, map);
  return Texture.from(canvas);
}

// ============================================================
// ENEMY SHIPS
// ============================================================
function createBasicEnemyTexture(): Texture {
  const W = 18, H = 15;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.enemyBasicBody, L = PALETTE.enemyBasicLight, D = PALETTE.enemyBasicDark;
  const E = '#ff2200';
  const _ = null;

  // Pointy aggressive fighter facing left
  const map: (string | null)[][] = [
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, D, D, _, _],  // 0
    [_, _, _, _, _, _, _, _, _, _, _, _, _, D, D, B, _, _],  // 1
    [_, _, _, _, _, _, _, _, _, _, _, _, D, D, B, B, _, _],  // 2
    [_, _, _, _, _, _, _, _, _, _, _, D, B, B, B, L, _, _],  // 3
    [_, _, _, _, _, _, _, _, _, D, D, B, B, B, L, L, L, _],  // 4
    [_, _, _, _, _, _, _, D, D, B, B, B, B, L, L, L, L, _],  // 5
    [_, _, _, _, D, D, D, B, B, B, B, B, L, L, E, E, _, _],  // 6
    [D, D, D, D, D, B, B, B, B, B, L, L, L, E, E, _, _, _],  // 7: center
    [_, _, _, _, D, D, D, B, B, B, B, B, L, L, E, E, _, _],  // 8
    [_, _, _, _, _, _, _, D, D, B, B, B, B, L, L, L, L, _],  // 9
    [_, _, _, _, _, _, _, _, _, D, D, B, B, B, L, L, L, _],  // 10
    [_, _, _, _, _, _, _, _, _, _, _, D, B, B, B, L, _, _],  // 11
    [_, _, _, _, _, _, _, _, _, _, _, _, D, D, B, B, _, _],  // 12
    [_, _, _, _, _, _, _, _, _, _, _, _, _, D, D, B, _, _],  // 13
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, D, D, _, _],  // 14
  ];

  drawPixelMap(ctx, 0, 0, map);
  return Texture.from(canvas);
}

function createSineEnemyTexture(): Texture {
  const W = 18, H = 16;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.enemySineBody, L = PALETTE.enemySineLight, D = PALETTE.enemySineDark;
  const _ = null;

  // Rounded interceptor with wide fins
  const map: (string | null)[][] = [
    [_, _, _, _, _, _, _, D, D, D, _, _, _, _, _, _, _, _],  // 0
    [_, _, _, _, _, _, D, D, B, D, _, _, _, _, _, _, _, _],  // 1
    [_, _, _, _, _, D, D, B, B, B, D, _, _, _, _, _, _, _],  // 2: top fin
    [_, _, _, _, D, D, B, B, B, B, B, D, _, _, _, _, _, _],  // 3
    [_, _, _, D, D, B, B, B, B, B, B, B, D, _, _, _, _, _],  // 4
    [_, _, D, D, B, B, B, L, L, B, B, B, B, D, _, _, _, _],  // 5
    [_, D, D, B, B, B, L, L, L, L, B, B, B, B, D, _, _, _],  // 6
    [D, D, B, B, B, B, L, L, L, L, B, B, B, B, B, D, D, D],  // 7: center
    [D, D, B, B, B, B, L, L, L, L, B, B, B, B, B, D, D, D],  // 8: center
    [_, D, D, B, B, B, L, L, L, L, B, B, B, B, D, _, _, _],  // 9
    [_, _, D, D, B, B, B, L, L, B, B, B, B, D, _, _, _, _],  // 10
    [_, _, _, D, D, B, B, B, B, B, B, B, D, _, _, _, _, _],  // 11
    [_, _, _, _, D, D, B, B, B, B, B, D, _, _, _, _, _, _],  // 12
    [_, _, _, _, _, D, D, B, B, B, D, _, _, _, _, _, _, _],  // 13: bottom fin
    [_, _, _, _, _, _, D, D, B, D, _, _, _, _, _, _, _, _],  // 14
    [_, _, _, _, _, _, _, D, D, D, _, _, _, _, _, _, _, _],  // 15
  ];

  drawPixelMap(ctx, 0, 0, map);
  return Texture.from(canvas);
}

function createFollowEnemyTexture(): Texture {
  const W = 16, H = 16;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.enemyFollowBody, L = PALETTE.enemyFollowLight, D = PALETTE.enemyFollowDark;
  const E = PALETTE.enemyFollowEye;
  const _ = null;

  // Menacing drone/eye with mechanical parts
  const map: (string | null)[][] = [
    [_, _, _, _, _, D, D, D, D, D, D, _, _, _, _, _],  // 0
    [_, _, _, D, D, D, B, B, B, B, D, D, D, _, _, _],  // 1
    [_, _, D, D, B, B, B, B, B, B, B, B, D, D, _, _],  // 2
    [_, D, D, B, B, B, B, L, L, B, B, B, B, D, D, _],  // 3
    [_, D, B, B, B, L, L, L, L, L, L, B, B, B, D, _],  // 4
    [D, D, B, B, L, L, E, E, E, E, L, L, B, B, D, D],  // 5
    [D, B, B, L, L, E, E, E, E, E, E, L, L, B, B, D],  // 6
    [D, B, B, L, E, E, '#fff', '#fff', '#fff', E, E, E, L, B, B, D],  // 7: eye center
    [D, B, B, L, E, E, '#fff', '#fff', '#fff', E, E, E, L, B, B, D],  // 8: eye center
    [D, B, B, L, L, E, E, E, E, E, E, L, L, B, B, D],  // 9
    [D, D, B, B, L, L, E, E, E, E, L, L, B, B, D, D],  // 10
    [_, D, B, B, B, L, L, L, L, L, L, B, B, B, D, _],  // 11
    [_, D, D, B, B, B, B, L, L, B, B, B, B, D, D, _],  // 12
    [_, _, D, D, B, B, B, B, B, B, B, B, D, D, _, _],  // 13
    [_, _, _, D, D, D, B, B, B, B, D, D, D, _, _, _],  // 14
    [_, _, _, _, _, D, D, D, D, D, D, _, _, _, _, _],  // 15
  ];

  drawPixelMap(ctx, 0, 0, map);
  return Texture.from(canvas);
}

function createDiagonalEnemyTexture(): Texture {
  const W = 16, H = 16;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.enemyDiagBody, L = PALETTE.enemyDiagLight, D = PALETTE.enemyDiagDark;
  const _ = null;

  // Diamond/arrow shaped speeder
  const map: (string | null)[][] = [
    [_, _, _, _, _, _, _, D, D, _, _, _, _, _, _, _],  // 0
    [_, _, _, _, _, _, D, D, B, D, _, _, _, _, _, _],  // 1
    [_, _, _, _, _, D, D, B, B, D, D, _, _, _, _, _],  // 2
    [_, _, _, _, D, D, B, B, B, B, D, D, _, _, _, _],  // 3
    [_, _, _, D, D, B, B, B, B, B, B, D, D, _, _, _],  // 4
    [_, _, D, D, B, B, B, L, L, B, B, B, D, D, _, _],  // 5
    [_, D, D, B, B, B, L, L, L, L, B, B, B, D, D, _],  // 6
    [D, D, B, B, B, L, L, L, L, L, L, B, B, B, D, D],  // 7: center
    [D, D, B, B, B, L, L, L, L, L, L, B, B, B, D, D],  // 8: center
    [_, D, D, B, B, B, L, L, L, L, B, B, B, D, D, _],  // 9
    [_, _, D, D, B, B, B, L, L, B, B, B, D, D, _, _],  // 10
    [_, _, _, D, D, B, B, B, B, B, B, D, D, _, _, _],  // 11
    [_, _, _, _, D, D, B, B, B, B, D, D, _, _, _, _],  // 12
    [_, _, _, _, _, D, D, B, B, D, D, _, _, _, _, _],  // 13
    [_, _, _, _, _, _, D, D, B, D, _, _, _, _, _, _],  // 14
    [_, _, _, _, _, _, _, D, D, _, _, _, _, _, _, _],  // 15
  ];

  drawPixelMap(ctx, 0, 0, map);
  return Texture.from(canvas);
}

// ============================================================
// BOSS (drawn bigger - 48x36 pixel art, displayed at 96x72)
// ============================================================
function createBossLevel1Texture(): Texture {
  const W = 48, H = 36;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.bossBody, L = PALETTE.bossLight, D = PALETTE.bossDark;
  const C = PALETTE.bossCore, G = PALETTE.bossCoreGlow, A = PALETTE.bossArmor;

  // Large warship - draw with filled regions instead of full pixel map for efficiency
  // Main hull
  ctx.fillStyle = D;
  ctx.fillRect(4, 6, 40, 24);
  ctx.fillStyle = B;
  ctx.fillRect(6, 8, 36, 20);
  ctx.fillStyle = L;
  ctx.fillRect(8, 10, 32, 16);

  // Front armor plating
  ctx.fillStyle = A;
  ctx.fillRect(38, 8, 6, 20);
  ctx.fillStyle = D;
  ctx.fillRect(40, 10, 4, 16);

  // Top cannon
  ctx.fillStyle = A;
  ctx.fillRect(10, 2, 14, 6);
  ctx.fillStyle = D;
  ctx.fillRect(12, 3, 10, 4);
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(22, 4, 4, 2);

  // Bottom cannon
  ctx.fillStyle = A;
  ctx.fillRect(10, 28, 14, 6);
  ctx.fillStyle = D;
  ctx.fillRect(12, 29, 10, 4);
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(22, 30, 4, 2);

  // Core (weak point) - pulsing circle
  ctx.fillStyle = G;
  ctx.fillRect(20, 14, 10, 8);
  ctx.fillStyle = C;
  ctx.fillRect(22, 15, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 17, 2, 2);

  // Engine exhausts (rear)
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(1, 12, 4, 4);
  ctx.fillRect(1, 20, 4, 4);
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(2, 13, 2, 2);
  ctx.fillRect(2, 21, 2, 2);

  // Detail lines
  ctx.fillStyle = D;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(10 + i * 8, 8, 1, 20);
  }

  return Texture.from(canvas);
}

function createBossLevel2Texture(): Texture {
  const W = 32, H = 32;
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.bossBody, L = PALETTE.bossLight, D = PALETTE.bossDark;
  const E = PALETTE.enemyFollowEye;

  // Snake/worm head - organic looking boss
  // Main head
  ctx.fillStyle = D;
  ctx.fillRect(4, 4, 24, 24);
  ctx.fillStyle = B;
  ctx.fillRect(6, 6, 20, 20);
  ctx.fillStyle = L;
  ctx.fillRect(8, 8, 16, 16);

  // Jaws
  ctx.fillStyle = D;
  ctx.fillRect(24, 10, 6, 5);
  ctx.fillRect(24, 17, 6, 5);
  // Teeth
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(26, 14, 2, 1);
  ctx.fillRect(28, 13, 2, 1);
  ctx.fillRect(26, 17, 2, 1);
  ctx.fillRect(28, 18, 2, 1);

  // Eyes
  ctx.fillStyle = E;
  ctx.fillRect(16, 10, 6, 5);
  ctx.fillRect(16, 17, 6, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(19, 11, 2, 3);
  ctx.fillRect(19, 18, 2, 3);

  // Armor ridges
  ctx.fillStyle = '#556677';
  ctx.fillRect(6, 4, 20, 2);
  ctx.fillRect(6, 26, 20, 2);

  return Texture.from(canvas);
}

// ============================================================
// ASTEROIDS - Various sizes (small 12x12, medium 20x20, large 28x28)
// ============================================================
function createAsteroidTexture(size: 'small' | 'medium' | 'large'): Texture {
  const dims = { small: 12, medium: 20, large: 28 };
  const W = dims[size], H = dims[size];
  const [canvas, ctx] = createCanvas(W, H);
  const B = PALETTE.rockBody, L = PALETTE.rockLight, D = PALETTE.rockDark, C = PALETTE.rockCrater;

  const r = W / 2 - 1;
  const cx = W / 2, cy = H / 2;

  // Draw rough circular shape with irregularities
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Irregular edge using seed-based noise
      const angle = Math.atan2(dy, dx);
      const edgeVariation = Math.sin(angle * 5 + size.length) * (r * 0.15) +
                           Math.cos(angle * 3 + size.length * 2) * (r * 0.1);
      const edgeR = r + edgeVariation;

      if (dist < edgeR) {
        // Inside the asteroid
        if (dist > edgeR - 1.5) {
          setPixel(ctx, x, y, D); // Dark edge
        } else if (dist < edgeR * 0.3) {
          setPixel(ctx, x, y, L); // Light center highlight
        } else {
          setPixel(ctx, x, y, B); // Main body
        }
      }
    }
  }

  // Add craters
  const craterCount = size === 'large' ? 4 : size === 'medium' ? 2 : 1;
  for (let i = 0; i < craterCount; i++) {
    const angle = (i / craterCount) * Math.PI * 2 + 0.5;
    const dist = r * 0.4;
    const crx = Math.floor(cx + Math.cos(angle) * dist);
    const cry = Math.floor(cy + Math.sin(angle) * dist);
    const crSize = size === 'large' ? 3 : 2;

    ctx.fillStyle = C;
    ctx.fillRect(crx - crSize / 2, cry - crSize / 2, crSize, crSize);
    ctx.fillStyle = D;
    ctx.fillRect(crx - crSize / 2 + 1, cry + crSize / 2 - 1, crSize - 1, 1);
  }

  return Texture.from(canvas);
}

// ============================================================
// POWERUP TEXTURES
// ============================================================
function createPowerUpTexture(type: 'triple' | 'parallel' | 'circle' | 'shield'): Texture {
  const W = 12, H = 12;
  const [canvas, ctx] = createCanvas(W, H);

  const colorMap = {
    triple: PALETTE.puTriple,
    parallel: PALETTE.puParallel,
    circle: PALETTE.puCircle,
    shield: PALETTE.puShield,
  };

  const color = colorMap[type];

  // Glowing orb
  const cx = 6, cy = 6, r = 5;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r) {
        if (dist < r * 0.4) {
          setPixel(ctx, x, y, '#ffffff');
        } else if (dist < r * 0.7) {
          setPixel(ctx, x, y, color);
        } else {
          const [cr, cg, cb] = hexToRgb(color);
          setPixel(ctx, x, y, `rgb(${cr >> 1},${cg >> 1},${cb >> 1})`);
        }
      }
    }
  }

  // Letter icon in center
  ctx.fillStyle = '#ffffff';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const letter = type === 'triple' ? 'T' : type === 'parallel' ? 'P' : type === 'circle' ? 'C' : 'S';
  ctx.fillText(letter, 6, 7);

  return Texture.from(canvas);
}

// ============================================================
// BULLET TEXTURES
// ============================================================
function createPlayerBulletTexture(): Texture {
  const W = 8, H = 4;
  const [canvas, ctx] = createCanvas(W, H);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(1, 1, 6, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 1, 3, 2);
  ctx.fillStyle = '#ff8800';
  ctx.fillRect(0, 0, 2, 4);
  return Texture.from(canvas);
}

function createEnemyBulletTexture(): Texture {
  const W = 6, H = 6;
  const [canvas, ctx] = createCanvas(W, H);
  // Glowing red/pink projectile
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(1, 1, 4, 4);
  ctx.fillStyle = '#ff6644';
  ctx.fillRect(2, 2, 2, 2);
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(0, 2, 1, 2);
  ctx.fillRect(5, 2, 1, 2);
  ctx.fillRect(2, 0, 2, 1);
  ctx.fillRect(2, 5, 2, 1);
  return Texture.from(canvas);
}

// ============================================================
// TEXTURE CACHE & PUBLIC API
// ============================================================
const textureCache = new Map<string, Texture>();

function getCached(key: string, factory: () => Texture): Texture {
  if (!textureCache.has(key)) {
    textureCache.set(key, factory());
  }
  return textureCache.get(key)!;
}

export const SpriteFactory = {
  player(): Texture {
    return getCached('player', createPlayerTexture);
  },

  enemyBasic(): Texture {
    return getCached('enemy_basic', createBasicEnemyTexture);
  },

  enemySine(): Texture {
    return getCached('enemy_sine', createSineEnemyTexture);
  },

  enemyFollow(): Texture {
    return getCached('enemy_follow', createFollowEnemyTexture);
  },

  enemyDiagonal(): Texture {
    return getCached('enemy_diagonal', createDiagonalEnemyTexture);
  },

  bossLevel1(): Texture {
    return getCached('boss_level1', createBossLevel1Texture);
  },

  bossLevel2(): Texture {
    return getCached('boss_level2', createBossLevel2Texture);
  },

  asteroidSmall(): Texture {
    return getCached('asteroid_small', () => createAsteroidTexture('small'));
  },

  asteroidMedium(): Texture {
    return getCached('asteroid_medium', () => createAsteroidTexture('medium'));
  },

  asteroidLarge(): Texture {
    return getCached('asteroid_large', () => createAsteroidTexture('large'));
  },

  powerUp(type: 'triple' | 'parallel' | 'circle' | 'shield'): Texture {
    return getCached(`powerup_${type}`, () => createPowerUpTexture(type));
  },

  playerBullet(): Texture {
    return getCached('bullet_player', createPlayerBulletTexture);
  },

  enemyBullet(): Texture {
    return getCached('bullet_enemy', createEnemyBulletTexture);
  },

  /**
   * Create a sprite scaled to the desired display size
   */
  createSprite(texture: Texture, displayWidth: number, displayHeight: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.width = displayWidth;
    sprite.height = displayHeight;
    sprite.anchor.set(0.5);
    return sprite;
  },
};
