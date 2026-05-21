import { Container, Graphics } from 'pixi.js';
import { Bounds } from '../types/index';

export class Entity {
  public container: Container;
  public vx = 0;
  public vy = 0;
  public hp = 1;
  public maxHp = 1;
  public active = false;
  public width = 0;
  public height = 0;

  protected graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  get x(): number {
    return this.container.x;
  }

  set x(val: number) {
    this.container.x = val;
  }

  get y(): number {
    return this.container.y;
  }

  set y(val: number) {
    this.container.y = val;
  }

  get bounds(): Bounds {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  reset(): void {
    this.active = false;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.container.visible = false;
    this.container.alpha = 1;
  }

  activate(): void {
    this.active = true;
    this.container.visible = true;
  }
}
