import { Container } from 'pixi.js';

export class Flash {
  private container: Container;
  private flashTimer = 0;
  private flashDuration = 0;
  private originalAlpha = 1;

  constructor(container: Container) {
    this.container = container;
  }

  flash(duration = 0.05): void {
    this.flashTimer = duration;
    this.flashDuration = duration;
    this.originalAlpha = this.container.alpha;
    this.container.alpha = 2; // Over-bright
  }

  update(dt: number): void {
    if (this.flashTimer <= 0) return;

    this.flashTimer -= dt;
    if (this.flashTimer <= 0) {
      this.container.alpha = this.originalAlpha;
    } else {
      const t = this.flashTimer / this.flashDuration;
      this.container.alpha = this.originalAlpha + t;
    }
  }

  get isFlashing(): boolean {
    return this.flashTimer > 0;
  }
}
