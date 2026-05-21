import { Graphics } from 'pixi.js';
import { Entity } from './Entity';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, PLAYER_MAX_HP, PLAYER_SPEED } from '../utils/constants';
import { clamp } from '../utils/math';
import { WeaponType } from '../types/index';
import { SpriteFactory } from '../utils/SpriteFactory';

export class Player extends Entity {
  public weaponType: WeaponType = 'normal';
  public weaponLevel = 1;
  public activeWeapons: Set<WeaponType> = new Set(['normal']);
  public lives = 3;
  public invincible = false;
  public invincibleTimer = 0;
  public shieldHits = 0;
  public speedMultiplier = 1;
  private blinkTimer = 0;

  constructor() {
    super();
    this.width = 48;
    this.height = 30;
    this.maxHp = PLAYER_MAX_HP;
    this.hp = PLAYER_MAX_HP;
    this.drawShip();
    this.active = true;
    this.container.visible = true;
  }

  private drawShip(): void {
    const sprite = SpriteFactory.createSprite(SpriteFactory.player(), this.width, this.height);
    this.setSprite(sprite);
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
    this.activeWeapons = new Set(['normal']);
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shieldHits = 0;
    this.speedMultiplier = 1;
    this.x = 60;
    this.y = GAME_HEIGHT / 2;
    this.active = true;
    this.container.visible = true;
  }

  /** Reset position/state for next level but keep weapons */
  levelReset(): void {
    this.hp = PLAYER_MAX_HP;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.x = 60;
    this.y = GAME_HEIGHT / 2;
    this.active = true;
    this.container.visible = true;
  }

  upgradeWeapon(type: WeaponType): void {
    this.activeWeapons.add(type);
    // Once you have a real weapon, remove the basic normal shot (it's redundant)
    if (type !== 'normal' && this.activeWeapons.size > 1) {
      this.activeWeapons.delete('normal');
    }
    if (this.weaponType === type) {
      this.weaponLevel = Math.min(this.weaponLevel + 1, 3);
    } else {
      this.weaponType = type;
      this.weaponLevel = 1;
    }
  }
}
