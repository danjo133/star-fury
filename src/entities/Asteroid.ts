import { Entity } from './Entity';
import { GAME_HEIGHT } from '../utils/constants';
import { SpriteFactory } from '../utils/SpriteFactory';
import { randomRange } from '../utils/math';

export type AsteroidSize = 'small' | 'medium' | 'large';

export class Asteroid extends Entity {
  public asteroidSize: AsteroidSize = 'medium';
  public rotationSpeed = 0;
  public scoreValue = 15;

  constructor() {
    super();
    this.width = 40;
    this.height = 40;
  }

  init(x: number, y: number, size: AsteroidSize, speed = 120): void {
    this.x = x;
    this.y = y;
    this.asteroidSize = size;

    switch (size) {
      case 'small':
        this.width = 24;
        this.height = 24;
        this.hp = 1;
        this.maxHp = 1;
        this.scoreValue = 15;
        break;
      case 'medium':
        this.width = 40;
        this.height = 40;
        this.hp = 3;
        this.maxHp = 3;
        this.scoreValue = 30;
        break;
      case 'large':
        this.width = 56;
        this.height = 56;
        this.hp = 6;
        this.maxHp = 6;
        this.scoreValue = 50;
        break;
    }

    this.vx = -speed;
    this.vy = randomRange(-30, 30);
    this.rotationSpeed = randomRange(-2, 2);
    this.activate();
    this.draw();
  }

  private draw(): void {
    const textureMap = {
      small: SpriteFactory.asteroidSmall(),
      medium: SpriteFactory.asteroidMedium(),
      large: SpriteFactory.asteroidLarge(),
    };
    const texture = textureMap[this.asteroidSize];
    const sprite = SpriteFactory.createSprite(texture, this.width, this.height);
    this.setSprite(sprite);
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Rotate the sprite
    if (this.sprite) {
      this.sprite.rotation += this.rotationSpeed * dt;
    }

    // Bounce off top/bottom edges
    if (this.y < this.height / 2 || this.y > GAME_HEIGHT - this.height / 2) {
      this.vy *= -1;
    }
  }

  reset(): void {
    super.reset();
    this.rotationSpeed = 0;
    if (this.sprite) {
      this.sprite.rotation = 0;
    }
  }
}
