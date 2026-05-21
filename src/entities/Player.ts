import { Graphics } from 'pixi.js';
import { Entity } from './Entity';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, PLAYER_MAX_HP, PLAYER_SPEED } from '../utils/constants';
import { clamp } from '../utils/math';
import { WeaponType } from '../types/index';

export class Player extends Entity {
  public weaponType: WeaponType = 'normal';
  public weaponLevel = 1;
  public lives = 3;
  public invincible = false;
  public invincibleTimer = 0;
  public shieldHits = 0;
  public speedMultiplier = 1;
  private blinkTimer = 0;

  constructor() {
    super();
    this.width = 32;
    this.height = 20;
    this.maxHp = PLAYER_MAX_HP;
    this.hp = PLAYER_MAX_HP;
    this.drawShip();
    this.active = true;
    this.container.visible = true;
  }

  private drawShip(): void {
    this.graphics.clear();

    // Main body - sleek fighter shape
    this.graphics
      .poly([
        { x: 16, y: 0 },     // nose
        { x: -8, y: -6 },    // top-back
        { x: -12, y: -4 },   // indent top
        { x: -12, y: 4 },    // indent bottom
        { x: -8, y: 6 },     // bottom-back
      ])
      .fill({ color: COLORS.player });

    // Wings
    this.graphics
      .poly([
        { x: -2, y: -6 },
        { x: -8, y: -12 },
        { x: -14, y: -10 },
        { x: -10, y: -6 },
      ])
      .fill({ color: COLORS.player });

    this.graphics
      .poly([
        { x: -2, y: 6 },
        { x: -8, y: 12 },
        { x: -14, y: 10 },
        { x: -10, y: 6 },
      ])
      .fill({ color: COLORS.player });

    // Engine glow
    this.graphics
      .circle(-14, 0, 3)
      .fill({ color: COLORS.playerEngine });
  }

  update(dt: number, inputX: number, inputY: number): void {
    const speed = PLAYER_SPEED * this.speedMultiplier;
    this.x += inputX * speed * dt;
    this.y += inputY * speed * dt;

    // Clamp to screen bounds
    this.x = clamp(this.x, this.width / 2, GAME_WIDTH - this.width / 2);
    this.y = clamp(this.y, this.height / 2, GAME_HEIGHT - this.height / 2);

    // Invincibility blink
    if (this.invincible) {
      this.invincibleTimer -= dt * 1000;
      this.blinkTimer += dt * 1000;
      if (this.blinkTimer > 100) {
        this.container.visible = !this.container.visible;
        this.blinkTimer = 0;
      }
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.container.visible = true;
      }
    }
  }

  hit(): boolean {
    if (this.invincible) return false;

    if (this.shieldHits > 0) {
      this.shieldHits--;
      return false;
    }

    this.lives--;
    if (this.lives <= 0) {
      return true; // dead
    }

    // Respawn with invincibility
    this.invincible = true;
    this.invincibleTimer = 2000;
    this.x = 60;
    this.y = GAME_HEIGHT / 2;
    return false;
  }

  fullReset(): void {
    this.lives = 3;
    this.hp = PLAYER_MAX_HP;
    this.weaponType = 'normal';
    this.weaponLevel = 1;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shieldHits = 0;
    this.speedMultiplier = 1;
    this.x = 60;
    this.y = GAME_HEIGHT / 2;
    this.active = true;
    this.container.visible = true;
  }

  upgradeWeapon(type: WeaponType): void {
    if (this.weaponType === type) {
      this.weaponLevel = Math.min(this.weaponLevel + 1, 3);
    } else {
      this.weaponType = type;
      this.weaponLevel = 1;
    }
  }
}
