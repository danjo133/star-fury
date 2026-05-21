import { Container } from 'pixi.js';

export class ScreenShake {
  private container: Container;
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  private originalX = 0;
  private originalY = 0;

  constructor(container: Container) {
    this.container = container;
  }

  shake(intensity: number, duration: number): void {
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
    this.originalX = this.container.x;
    this.originalY = this.container.y;
  }

  update(dt: number): void {
    if (this.elapsed >= this.duration) {
      this.container.x = this.originalX;
      this.container.y = this.originalY;
      return;
    }

    this.elapsed += dt;
    const progress = this.elapsed / this.duration;
    const currentIntensity = this.intensity * (1 - progress);

    this.container.x = this.originalX + (Math.random() - 0.5) * currentIntensity * 2;
    this.container.y = this.originalY + (Math.random() - 0.5) * currentIntensity * 2;
  }

  get isShaking(): boolean {
    return this.elapsed < this.duration;
  }
}
