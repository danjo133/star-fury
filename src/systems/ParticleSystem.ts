import { Container, Graphics } from 'pixi.js';
import { ParticleConfig } from '../types/index';
import { randomRange } from '../utils/math';

interface Particle {
  graphics: Graphics;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private container: Container;
  private poolIndex = 0;
  private readonly MAX_PARTICLES = 200;

  constructor(parentContainer: Container) {
    this.container = new Container();
    parentContainer.addChild(this.container);

    // Pre-allocate particles
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const g = new Graphics();
      g.visible = false;
      this.container.addChild(g);
      this.particles.push({
        graphics: g,
        vx: 0,
        vy: 0,
        lifetime: 0,
        maxLifetime: 0,
        active: false,
      });
    }
  }

  emit(config: ParticleConfig): void {
    const { x, y, color, count, speed, lifetime, size } = config;

    for (let i = 0; i < count; i++) {
      const particle = this.particles[this.poolIndex];
      this.poolIndex = (this.poolIndex + 1) % this.MAX_PARTICLES;

      const angle = randomRange(0, Math.PI * 2);
      const spd = randomRange(speed * 0.5, speed);

      particle.vx = Math.cos(angle) * spd;
      particle.vy = Math.sin(angle) * spd;
      particle.lifetime = lifetime;
      particle.maxLifetime = lifetime;
      particle.active = true;

      particle.graphics.clear();
      particle.graphics
        .rect(-size / 2, -size / 2, size, size)
        .fill({ color });
      particle.graphics.x = x;
      particle.graphics.y = y;
      particle.graphics.visible = true;
      particle.graphics.alpha = 1;
    }
  }

  emitExplosion(x: number, y: number, color: number, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const configs = {
      small: { count: 8, speed: 150, lifetime: 0.3, size: 2 },
      medium: { count: 15, speed: 200, lifetime: 0.5, size: 3 },
      large: { count: 25, speed: 300, lifetime: 0.7, size: 4 },
    };
    const cfg = configs[size];
    this.emit({ x, y, color, ...cfg });
  }

  emitTrail(x: number, y: number, color: number): void {
    this.emit({
      x,
      y,
      color,
      count: 2,
      speed: 50,
      lifetime: 0.2,
      size: 2,
    });
  }

  update(dt: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.lifetime -= dt;
      if (particle.lifetime <= 0) {
        particle.active = false;
        particle.graphics.visible = false;
        continue;
      }

      particle.graphics.x += particle.vx * dt;
      particle.graphics.y += particle.vy * dt;
      particle.graphics.alpha = particle.lifetime / particle.maxLifetime;

      // Slow down
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
  }

  clear(): void {
    for (const particle of this.particles) {
      particle.active = false;
      particle.graphics.visible = false;
    }
  }
}
