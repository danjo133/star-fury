/**
 * Parallax scrolling background with multiple layers:
 * - Deep space (dark, slow stars)
 * - Nebula/galaxy clouds (midground, medium speed)
 * - Bright stars (foreground, fast)
 */

import { Container, Graphics, Texture, Sprite } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

interface StarLayer {
  container: Container;
  speed: number;
  stars: { sprite: Graphics; x: number; y: number }[];
}

interface NebulaCloud {
  sprite: Sprite;
  speed: number;
  x: number;
}

function createNebulaTexture(width: number, height: number, color1: number, color2: number, seed: number): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create soft nebula cloud using radial gradients
  const cx = width / 2, cy = height / 2;
  const r = Math.min(width, height) / 2;

  // Primary color cloud
  const r1 = ((color1 >> 16) & 0xff);
  const g1 = ((color1 >> 8) & 0xff);
  const b1 = (color1 & 0xff);

  const r2 = ((color2 >> 16) & 0xff);
  const g2 = ((color2 >> 8) & 0xff);
  const b2 = (color2 & 0xff);

  // Multiple overlapping soft circles for organic shape
  const blobs = 3 + (seed % 4);
  for (let i = 0; i < blobs; i++) {
    const angle = (i / blobs) * Math.PI * 2 + seed;
    const dist = r * 0.2;
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;
    const br = r * (0.5 + (((seed * (i + 1)) % 100) / 200));

    const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    const t = i / blobs;
    const cr = Math.floor(r1 + (r2 - r1) * t);
    const cg = Math.floor(g1 + (g2 - g1) * t);
    const cb = Math.floor(b1 + (b2 - b1) * t);

    gradient.addColorStop(0, `rgba(${cr},${cg},${cb},0.15)`);
    gradient.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.08)`);
    gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  return Texture.from(canvas);
}

function createGalaxyTexture(size: number, color: number, seed: number): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2, cy = size / 2;
  const r = ((color >> 16) & 0xff);
  const g = ((color >> 8) & 0xff);
  const b = (color & 0xff);

  // Core glow
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.15);
  coreGrad.addColorStop(0, `rgba(${Math.min(255, r + 100)},${Math.min(255, g + 100)},${Math.min(255, b + 100)},0.3)`);
  coreGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);

  // Spiral arms using dots
  const arms = 2;
  const dotsPerArm = 40;
  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = (arm / arms) * Math.PI * 2 + seed;
    for (let i = 0; i < dotsPerArm; i++) {
      const t = i / dotsPerArm;
      const angle = baseAngle + t * Math.PI * 2.5;
      const dist = t * size * 0.4;
      const spread = (1 + t * 3) * ((seed * i) % 3 + 1);

      const dx = cx + Math.cos(angle) * dist + (Math.sin(seed * i) * spread);
      const dy = cy + Math.sin(angle) * dist + (Math.cos(seed * i) * spread);

      const alpha = (1 - t) * 0.2;
      const dotSize = (1 - t) * 2 + 0.5;

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(dx - dotSize / 2, dy - dotSize / 2, dotSize, dotSize);
    }
  }

  return Texture.from(canvas);
}

export class ParallaxBackground {
  public container: Container;
  private layers: StarLayer[] = [];
  private nebulae: NebulaCloud[] = [];
  private galaxies: NebulaCloud[] = [];

  constructor() {
    this.container = new Container();
    this.createDeepStars();
    this.createNebulae();
    this.createGalaxies();
    this.createBrightStars();
  }

  private createDeepStars(): void {
    const layer: StarLayer = {
      container: new Container(),
      speed: 15,
      stars: [],
    };

    for (let i = 0; i < 60; i++) {
      const star = new Graphics();
      const brightness = 0.2 + Math.random() * 0.3;
      const size = Math.random() < 0.3 ? 2 : 1;
      star.rect(0, 0, size, size).fill({ color: 0xffffff });
      star.alpha = brightness;
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      star.x = x;
      star.y = y;
      layer.container.addChild(star);
      layer.stars.push({ sprite: star, x, y });
    }

    this.container.addChild(layer.container);
    this.layers.push(layer);
  }

  private createNebulae(): void {
    const nebulaColors: [number, number][] = [
      [0x4400aa, 0x0044cc],  // Purple-blue
      [0xaa2200, 0x660044],  // Red-purple
      [0x004488, 0x006644],  // Blue-teal
      [0x882200, 0xcc4400],  // Orange-red
    ];

    for (let i = 0; i < 3; i++) {
      const [c1, c2] = nebulaColors[i % nebulaColors.length];
      const w = 200 + Math.random() * 200;
      const h = 150 + Math.random() * 150;
      const texture = createNebulaTexture(Math.floor(w), Math.floor(h), c1, c2, i * 7 + 3);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = Math.random() * (GAME_WIDTH + w) - w / 2;
      sprite.y = Math.random() * GAME_HEIGHT;
      sprite.alpha = 0.6;
      this.container.addChild(sprite);
      this.nebulae.push({ sprite, speed: 20 + i * 5, x: sprite.x });
    }
  }

  private createGalaxies(): void {
    const galaxyColors = [0x8866cc, 0xcc8844, 0x4488cc];

    for (let i = 0; i < 2; i++) {
      const size = 80 + Math.random() * 60;
      const color = galaxyColors[i % galaxyColors.length];
      const texture = createGalaxyTexture(Math.floor(size), color, i * 13 + 5);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = Math.random() * GAME_WIDTH;
      sprite.y = Math.random() * GAME_HEIGHT;
      sprite.alpha = 0.5;
      this.container.addChild(sprite);
      this.galaxies.push({ sprite, speed: 10 + i * 5, x: sprite.x });
    }
  }

  private createBrightStars(): void {
    // Medium stars
    const medLayer: StarLayer = {
      container: new Container(),
      speed: 40,
      stars: [],
    };

    for (let i = 0; i < 35; i++) {
      const star = new Graphics();
      const brightness = 0.4 + Math.random() * 0.3;
      star.rect(0, 0, 1, 1).fill({ color: 0xffffff });
      star.alpha = brightness;
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      star.x = x;
      star.y = y;
      medLayer.container.addChild(star);
      medLayer.stars.push({ sprite: star, x, y });
    }
    this.container.addChild(medLayer.container);
    this.layers.push(medLayer);

    // Fast bright stars (foreground)
    const fastLayer: StarLayer = {
      container: new Container(),
      speed: 80,
      stars: [],
    };

    for (let i = 0; i < 20; i++) {
      const star = new Graphics();
      const size = Math.random() < 0.2 ? 3 : 2;
      // Some colored stars
      const colors = [0xffffff, 0xffffff, 0xaaccff, 0xffccaa, 0xaaffcc];
      const color = colors[Math.floor(Math.random() * colors.length)];
      star.rect(0, 0, size, size).fill({ color });
      star.alpha = 0.6 + Math.random() * 0.4;
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      star.x = x;
      star.y = y;
      fastLayer.container.addChild(star);
      fastLayer.stars.push({ sprite: star, x, y });
    }
    this.container.addChild(fastLayer.container);
    this.layers.push(fastLayer);
  }

  update(dt: number): void {
    // Scroll star layers
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.sprite.x -= layer.speed * dt;
        if (star.sprite.x < -5) {
          star.sprite.x = GAME_WIDTH + 5;
          star.sprite.y = Math.random() * GAME_HEIGHT;
        }
      }
    }

    // Scroll nebulae
    for (const nebula of this.nebulae) {
      nebula.sprite.x -= nebula.speed * dt;
      if (nebula.sprite.x < -250) {
        nebula.sprite.x = GAME_WIDTH + 250;
        nebula.sprite.y = Math.random() * GAME_HEIGHT;
      }
    }

    // Scroll galaxies
    for (const galaxy of this.galaxies) {
      galaxy.sprite.x -= galaxy.speed * dt;
      if (galaxy.sprite.x < -100) {
        galaxy.sprite.x = GAME_WIDTH + 100;
        galaxy.sprite.y = Math.random() * GAME_HEIGHT;
      }
    }
  }
}
