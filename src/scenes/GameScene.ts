import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene as IScene, PowerUpType } from '../types/index';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { PowerUp } from '../entities/PowerUp';
import { Boss } from '../entities/Boss';
import { ObjectPool } from '../utils/ObjectPool';
import { MovementSystem } from '../systems/MovementSystem';
import { CollisionSystem, CollisionEvent } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { ScreenShake } from '../effects/ScreenShake';
import { Flash } from '../effects/Flash';
import { InputManager } from '../managers/InputManager';
import { AudioManager } from '../managers/AudioManager';
import { ScoreManager } from '../managers/ScoreManager';
import { LevelManager } from '../levels/LevelManager';
import {
  GAME_WIDTH, GAME_HEIGHT, POOL_BULLETS, POOL_ENEMY_BULLETS,
  POOL_ENEMIES, POOL_PARTICLES, COLORS, POWERUP_DROP_CHANCE,
  SCORE_BOSS,
} from '../utils/constants';
import { randomRange } from '../utils/math';

type GameState = 'playing' | 'boss_intro' | 'boss_fight' | 'level_clear' | 'game_over' | 'victory';

export class GameScene implements IScene {
  public container: Container;
  private gameContainer: Container;
  private hudContainer: Container;
  private bgContainer: Container;

  private player: Player;
  private boss: Boss | null = null;
  private enemyPool: ObjectPool<Enemy>;
  private playerBulletPool: ObjectPool<Bullet>;
  private enemyBulletPool: ObjectPool<Bullet>;
  private powerUpPool: ObjectPool<PowerUp>;

  private movementSystem: MovementSystem;
  private collisionSystem: CollisionSystem;
  private spawnSystem: SpawnSystem;
  private particleSystem: ParticleSystem;
  private weaponSystem: WeaponSystem;

  private screenShake: ScreenShake;
  private flash: Flash;

  private input: InputManager;
  private audio: AudioManager;
  private scoreManager: ScoreManager;
  private levelManager: LevelManager;

  private state: GameState = 'playing';
  private stateTimer = 0;
  private hitStopTimer = 0;

  // Background stars
  private stars: { g: Graphics; speed: number }[] = [];

  // HUD elements
  private scoreText!: Text;
  private livesText!: Text;
  private weaponText!: Text;
  private multiplierText!: Text;
  private levelText!: Text;
  private bossHpBar!: Graphics;
  private messageText!: Text;

  // Score popups
  private scorePopups: { text: Text; timer: number }[] = [];

  private onGameOver: (score: number) => void;

  constructor(input: InputManager, audio: AudioManager, scoreManager: ScoreManager, onGameOver: (score: number) => void) {
    this.container = new Container();
    this.bgContainer = new Container();
    this.gameContainer = new Container();
    this.hudContainer = new Container();

    this.container.addChild(this.bgContainer);
    this.container.addChild(this.gameContainer);
    this.container.addChild(this.hudContainer);

    this.input = input;
    this.audio = audio;
    this.scoreManager = scoreManager;
    this.onGameOver = onGameOver;
    this.levelManager = new LevelManager();

    // Create pools
    this.enemyPool = new ObjectPool(
      () => new Enemy(),
      (e) => { e.reset(); e.container.removeFromParent(); },
      POOL_ENEMIES
    );

    this.playerBulletPool = new ObjectPool(
      () => new Bullet(),
      (b) => { b.reset(); b.container.removeFromParent(); },
      POOL_BULLETS
    );

    this.enemyBulletPool = new ObjectPool(
      () => new Bullet(),
      (b) => { b.reset(); b.container.removeFromParent(); },
      POOL_ENEMY_BULLETS
    );

    this.powerUpPool = new ObjectPool(
      () => new PowerUp(),
      (p) => { p.reset(); p.container.removeFromParent(); },
      20
    );

    // Create player
    this.player = new Player();
    this.player.x = 60;
    this.player.y = GAME_HEIGHT / 2;
    this.gameContainer.addChild(this.player.container);

    // Create systems
    this.movementSystem = new MovementSystem();
    this.collisionSystem = new CollisionSystem();
    this.spawnSystem = new SpawnSystem(this.enemyPool, this.gameContainer);
    this.particleSystem = new ParticleSystem(this.gameContainer);
    this.weaponSystem = new WeaponSystem(this.playerBulletPool, this.enemyBulletPool, this.gameContainer);

    // Create effects
    this.screenShake = new ScreenShake(this.gameContainer);
    this.flash = new Flash(this.gameContainer);

    // Setup
    this.createBackground();
    this.createHUD();
  }

  enter(): void {
    this.scoreManager.reset();
    this.levelManager.reset();
    this.player.fullReset();
    this.state = 'playing';
    this.stateTimer = 0;
    this.startLevel();
    this.audio.startMusic();
  }

  exit(): void {
    this.audio.stopMusic();
    this.cleanup();
  }

  private startLevel(): void {
    this.spawnSystem.loadWaves(this.levelManager.currentConfig.waves);
    this.state = 'playing';
    this.stateTimer = 0;

    // Show level name briefly
    this.showMessage(this.levelManager.levelName, 3);
  }

  private cleanup(): void {
    this.enemyPool.releaseAll();
    this.playerBulletPool.releaseAll();
    this.enemyBulletPool.releaseAll();
    this.powerUpPool.releaseAll();
    this.particleSystem.clear();
    if (this.boss) {
      this.boss.container.removeFromParent();
      this.boss = null;
    }
    this.scorePopups.forEach((p) => p.text.removeFromParent());
    this.scorePopups = [];
  }

  update(dt: number): void {
    // Hit-stop (brief pause on significant hits)
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      this.updateBackground(dt); // Keep bg moving
      this.particleSystem.update(dt);
      return;
    }

    // Update background
    this.updateBackground(dt);

    // Update effects
    this.screenShake.update(dt);
    this.flash.update(dt);
    this.particleSystem.update(dt);

    // Update score popups
    this.updateScorePopups(dt);

    // State machine
    switch (this.state) {
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'boss_intro':
        this.updateBossIntro(dt);
        break;
      case 'boss_fight':
        this.updateBossFight(dt);
        break;
      case 'level_clear':
        this.updateLevelClear(dt);
        break;
      case 'game_over':
        this.updateGameOver(dt);
        break;
      case 'victory':
        this.updateVictory(dt);
        break;
    }

    // Update HUD
    this.updateHUD();
  }

  private updatePlaying(dt: number): void {
    this.updatePlayer(dt);
    this.spawnSystem.update(dt);
    this.movementSystem.update(dt, this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, null);
    this.weaponSystem.update(dt, this.player, this.input.shoot, this.enemyPool, null);
    this.updatePowerUps(dt);
    this.handleCollisions();
    this.handleEnemyShooting();

    // Check if all waves done -> boss
    if (this.spawnSystem.allWavesComplete) {
      this.startBossIntro();
    }
  }

  private updateBossIntro(dt: number): void {
    this.updatePlayer(dt);
    this.movementSystem.update(dt, this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, this.boss);
    this.stateTimer -= dt;

    if (this.stateTimer <= 0) {
      this.state = 'boss_fight';
      this.showMessage('', 0);
    }
  }

  private updateBossFight(dt: number): void {
    this.updatePlayer(dt);
    this.movementSystem.update(dt, this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, this.boss);
    this.weaponSystem.update(dt, this.player, this.input.shoot, this.enemyPool, this.boss);
    this.updatePowerUps(dt);
    this.handleCollisions();

    if (this.boss?.defeated) {
      this.audio.play('explosion');
      this.particleSystem.emitExplosion(this.boss.x, this.boss.y, COLORS.boss, 'large');
      this.screenShake.shake(15, 0.5);
      this.scoreManager.addKill(SCORE_BOSS);
      this.spawnScorePopup(this.boss.x, this.boss.y, SCORE_BOSS * this.scoreManager.multiplier);
      this.boss.container.removeFromParent();
      this.boss = null;
      this.state = 'level_clear';
      this.stateTimer = 3;
      this.audio.play('level_clear');
      this.showMessage('LEVEL CLEAR!', 3);
    }
  }

  private updateLevelClear(dt: number): void {
    this.stateTimer -= dt;
    this.particleSystem.update(dt);

    if (this.stateTimer <= 0) {
      this.cleanup();
      const hasNext = this.levelManager.nextLevel();
      if (hasNext) {
        this.player.fullReset();
        this.gameContainer.addChild(this.player.container);
        this.startLevel();
      } else {
        this.state = 'victory';
        this.stateTimer = 5;
        this.showMessage('VICTORY!\nALL SECTORS CLEARED!', 5);
      }
    }
  }

  private updateGameOver(dt: number): void {
    this.stateTimer -= dt;
    this.particleSystem.update(dt);
    if (this.stateTimer <= 0) {
      this.scoreManager.saveHiScore();
      this.onGameOver(this.scoreManager.score);
    }
  }

  private updateVictory(dt: number): void {
    this.stateTimer -= dt;
    this.particleSystem.update(dt);
    if (this.stateTimer <= 0) {
      this.scoreManager.saveHiScore();
      this.onGameOver(this.scoreManager.score);
    }
  }

  private updatePlayer(dt: number): void {
    let ix = 0;
    let iy = 0;
    if (this.input.left) ix -= 1;
    if (this.input.right) ix += 1;
    if (this.input.up) iy -= 1;
    if (this.input.down) iy += 1;

    // Normalize diagonal
    if (ix !== 0 && iy !== 0) {
      const len = Math.SQRT2;
      ix /= len;
      iy /= len;
    }

    this.player.update(dt, ix, iy);
  }

  private handleCollisions(): void {
    const events = this.collisionSystem.checkCollisions(
      this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, this.powerUpPool, this.boss
    );

    for (const event of events) {
      this.handleCollisionEvent(event);
    }
  }

  private handleCollisionEvent(event: CollisionEvent): void {
    switch (event.type) {
      case 'enemy_hit':
        this.audio.play('hit');
        if (event.enemy && event.enemy.hp <= 0) {
          // Enemy killed
          this.audio.play('explosion');
          this.particleSystem.emitExplosion(event.x, event.y, COLORS.explosion, 'medium');
          const points = this.scoreManager.addKill(event.enemy.scoreValue);
          this.spawnScorePopup(event.x, event.y, points);
          this.maybeDropPowerUp(event.x, event.y);
          this.hitStopTimer = 0.02;
        } else {
          this.particleSystem.emitExplosion(event.x, event.y, 0xffffff, 'small');
        }
        break;

      case 'boss_hit':
        this.audio.play('boss_hit');
        this.particleSystem.emitExplosion(event.x, event.y, COLORS.bossCore, 'small');
        this.screenShake.shake(3, 0.1);
        break;

      case 'player_hit':
      case 'enemy_contact': {
        const dead = this.player.hit();
        if (!dead) {
          this.audio.play('hit');
          this.screenShake.shake(8, 0.3);
          this.particleSystem.emitExplosion(event.x, event.y, COLORS.player, 'small');
        }
        if (dead) {
          this.audio.play('explosion');
          this.particleSystem.emitExplosion(this.player.x, this.player.y, COLORS.player, 'large');
          this.screenShake.shake(12, 0.5);
          this.player.container.visible = false;
          this.state = 'game_over';
          this.stateTimer = 2;
          this.showMessage('GAME OVER', 2);
          this.audio.stopMusic();
        }
        break;
      }

      case 'powerup_collected':
        this.audio.play('powerup');
        this.applyPowerUp(event.powerUp!.powerUpType);
        this.particleSystem.emitExplosion(event.x, event.y, 0xffffff, 'small');
        break;
    }
  }

  private handleEnemyShooting(): void {
    // Enemy shooting is handled by WeaponSystem
  }

  private maybeDropPowerUp(x: number, y: number): void {
    if (Math.random() > POWERUP_DROP_CHANCE) return;

    const types: PowerUpType[] = ['spread', 'laser', 'missile', 'speed', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pu = this.powerUpPool.get();
    pu.init(x, y, type);
    this.gameContainer.addChild(pu.container);
  }

  private applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case 'spread':
        this.player.upgradeWeapon('spread');
        break;
      case 'laser':
        this.player.upgradeWeapon('laser');
        break;
      case 'missile':
        this.player.upgradeWeapon('missile');
        break;
      case 'speed':
        this.player.speedMultiplier = Math.min(this.player.speedMultiplier + 0.3, 2.0);
        break;
      case 'shield':
        this.player.shieldHits = 3;
        break;
    }
  }

  private updatePowerUps(dt: number): void {
    const toRelease: PowerUp[] = [];
    for (const pu of this.powerUpPool.active) {
      pu.update(dt);
      if (pu.x < -20) {
        toRelease.push(pu);
      }
    }
    toRelease.forEach((p) => this.powerUpPool.release(p));
  }

  private startBossIntro(): void {
    this.state = 'boss_intro';
    this.stateTimer = 2;
    this.showMessage('WARNING!\nBOSS APPROACHING', 2);

    // Create boss
    this.boss = new Boss();
    this.boss.init(this.levelManager.getBossType());
    this.gameContainer.addChild(this.boss.container);
  }

  // Background
  private createBackground(): void {
    // Create star layers
    for (let layer = 0; layer < 3; layer++) {
      const speed = 30 + layer * 40;
      const count = 20 + layer * 15;
      const size = 1 + layer * 0.5;

      for (let i = 0; i < count; i++) {
        const star = new Graphics();
        const alpha = 0.3 + layer * 0.2;
        star
          .rect(0, 0, size, size)
          .fill({ color: COLORS.star });
        star.alpha = alpha;
        star.x = Math.random() * GAME_WIDTH;
        star.y = Math.random() * GAME_HEIGHT;
        this.bgContainer.addChild(star);
        this.stars.push({ g: star, speed });
      }
    }
  }

  private updateBackground(dt: number): void {
    for (const star of this.stars) {
      star.g.x -= star.speed * dt;
      if (star.g.x < -5) {
        star.g.x = GAME_WIDTH + 5;
        star.g.y = Math.random() * GAME_HEIGHT;
      }
    }
  }

  // HUD
  private createHUD(): void {
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: COLORS.hud,
    });

    this.scoreText = new Text({ text: 'SCORE: 0', style });
    this.scoreText.x = 10;
    this.scoreText.y = 10;

    this.livesText = new Text({ text: 'LIVES: 3', style });
    this.livesText.x = GAME_WIDTH / 2 - 40;
    this.livesText.y = 10;

    this.weaponText = new Text({ text: 'WPN: NORMAL', style });
    this.weaponText.x = GAME_WIDTH - 150;
    this.weaponText.y = 10;

    this.multiplierText = new Text({ text: '', style: new TextStyle({ ...style, fontSize: 12, fill: 0xffff00 }) });
    this.multiplierText.x = 10;
    this.multiplierText.y = 28;

    this.levelText = new Text({ text: '', style: new TextStyle({ ...style, fontSize: 11, fill: 0x888888 }) });
    this.levelText.x = GAME_WIDTH / 2 - 60;
    this.levelText.y = GAME_HEIGHT - 20;

    this.bossHpBar = new Graphics();
    this.bossHpBar.x = GAME_WIDTH / 2 - 100;
    this.bossHpBar.y = 30;
    this.bossHpBar.visible = false;

    this.messageText = new Text({
      text: '',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 24, fill: 0xffffff, align: 'center' }),
    });
    this.messageText.anchor.set(0.5);
    this.messageText.x = GAME_WIDTH / 2;
    this.messageText.y = GAME_HEIGHT / 2;

    this.hudContainer.addChild(this.scoreText);
    this.hudContainer.addChild(this.livesText);
    this.hudContainer.addChild(this.weaponText);
    this.hudContainer.addChild(this.multiplierText);
    this.hudContainer.addChild(this.levelText);
    this.hudContainer.addChild(this.bossHpBar);
    this.hudContainer.addChild(this.messageText);
  }

  private updateHUD(): void {
    this.scoreText.text = `SCORE: ${this.scoreManager.score}`;
    this.livesText.text = `LIVES: ${this.player.lives}`;
    this.weaponText.text = `WPN: ${this.player.weaponType.toUpperCase()} Lv${this.player.weaponLevel}`;
    this.levelText.text = `LV ${this.levelManager.currentLevel + 1}`;

    if (this.scoreManager.multiplier > 1) {
      this.multiplierText.text = `x${this.scoreManager.multiplier} CHAIN!`;
    } else {
      this.multiplierText.text = '';
    }

    // Boss HP bar
    if (this.boss?.active && !this.boss.defeated && this.state === 'boss_fight') {
      this.bossHpBar.visible = true;
      this.bossHpBar.clear();
      this.bossHpBar
        .rect(0, 0, 200, 8)
        .fill({ color: 0x333333 });
      const hpPercent = Math.max(0, this.boss.hp / this.boss.maxHp);
      const barColor = hpPercent > 0.5 ? 0xff0000 : hpPercent > 0.25 ? 0xff8800 : 0xffff00;
      this.bossHpBar
        .rect(0, 0, 200 * hpPercent, 8)
        .fill({ color: barColor });
    } else {
      this.bossHpBar.visible = false;
    }
  }

  private showMessage(text: string, duration: number): void {
    this.messageText.text = text;
    if (duration > 0) {
      setTimeout(() => {
        if (this.messageText.text === text) {
          this.messageText.text = '';
        }
      }, duration * 1000);
    }
  }

  // Score popups
  private spawnScorePopup(x: number, y: number, points: number): void {
    const text = new Text({
      text: `+${points}`,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xffff00 }),
    });
    text.x = x;
    text.y = y;
    this.gameContainer.addChild(text);
    this.scorePopups.push({ text, timer: 0.8 });
  }

  private updateScorePopups(dt: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.scorePopups.length; i++) {
      const popup = this.scorePopups[i];
      popup.timer -= dt;
      popup.text.y -= 40 * dt;
      popup.text.alpha = Math.max(0, popup.timer / 0.8);
      if (popup.timer <= 0) {
        popup.text.removeFromParent();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.scorePopups.splice(toRemove[i], 1);
    }
  }
}
