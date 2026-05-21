import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene as IScene, PowerUpType } from '../types/index';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { PowerUp } from '../entities/PowerUp';
import { Boss } from '../entities/Boss';
import { Asteroid } from '../entities/Asteroid';
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
import { ParallaxBackground } from '../utils/ParallaxBackground';
import {
  GAME_WIDTH, GAME_HEIGHT, POOL_BULLETS, POOL_ENEMY_BULLETS,
  POOL_ENEMIES, POOL_PARTICLES, COLORS,
  SCORE_BOSS,
} from '../utils/constants';

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

  // Parallax background
  private parallaxBg: ParallaxBackground;

  // Asteroids
  private asteroidPool: ObjectPool<Asteroid>;
  private asteroidSpawnTimer = 0;
  private asteroidSpawnInterval = 3; // seconds between asteroid spawns

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

  // Shield bubble visual
  private shieldBubble: Graphics;

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

    // Create parallax background
    this.parallaxBg = new ParallaxBackground();
    this.bgContainer.addChild(this.parallaxBg.container);

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

    this.asteroidPool = new ObjectPool(
      () => new Asteroid(),
      (a) => { a.reset(); a.container.removeFromParent(); },
      15
    );

    // Create player
    this.player = new Player();
    this.player.x = 60;
    this.player.y = GAME_HEIGHT / 2;
    this.gameContainer.addChild(this.player.container);

    // Create shield bubble (attached to player)
    this.shieldBubble = new Graphics();
    this.shieldBubble.visible = false;
    this.player.container.addChild(this.shieldBubble);

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
    const config = this.levelManager.currentConfig;
    this.spawnSystem.loadWaves(config.waves, config.bossTime);
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
    this.asteroidPool.releaseAll();
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
      this.parallaxBg.update(dt); // Keep bg moving
      this.particleSystem.update(dt);
      return;
    }

    // Update background
    this.parallaxBg.update(dt);

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
    this.movementSystem.update(dt, this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, null, (e) => this.spawnSystem.notifyEnemyLeft(e));
    this.weaponSystem.update(dt, this.player, this.input.shoot, this.enemyPool, null);
    this.updatePowerUps(dt);
    this.updateAsteroids(dt);
    this.handleCollisions();
    this.handleEnemyShooting();

    // Check if all waves done -> boss
    if (this.spawnSystem.allWavesComplete) {
      this.startBossIntro();
    }
  }

  private updateBossIntro(dt: number): void {
    this.updatePlayer(dt);
    this.movementSystem.update(dt, this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, this.boss, (e) => this.spawnSystem.notifyEnemyLeft(e));
    this.stateTimer -= dt;

    if (this.stateTimer <= 0) {
      this.state = 'boss_fight';
      this.showMessage('', 0);
    }
  }

  private updateBossFight(dt: number): void {
    this.updatePlayer(dt);
    this.movementSystem.update(dt, this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, this.boss, (e) => this.spawnSystem.notifyEnemyLeft(e));
    this.weaponSystem.update(dt, this.player, this.input.shoot, this.enemyPool, this.boss);
    this.updatePowerUps(dt);
    this.updateAsteroids(dt);
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
        this.player.levelReset();
        this.gameContainer.addChild(this.player.container);
        this.startLevel();
        this.audio.nextGameTrack();
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
      this.player, this.enemyPool, this.playerBulletPool, this.enemyBulletPool, this.powerUpPool, this.boss, this.asteroidPool
    );

    for (const event of events) {
      this.handleCollisionEvent(event);
    }
  }

  private handleCollisionEvent(event: CollisionEvent): void {
    switch (event.type) {
      case 'enemy_hit':
        this.audio.play('hit');
        if (event.enemy && event.killed) {
          // Enemy killed
          this.audio.play('explosion');
          this.particleSystem.emitExplosion(event.x, event.y, COLORS.explosion, 'medium');
          const points = this.scoreManager.addKill(event.enemy.scoreValue);
          this.spawnScorePopup(event.x, event.y, points);

          // Check if entire wave group is eliminated
          const waveCleared = this.spawnSystem.notifyEnemyKilled(event.enemy);
          if (waveCleared) {
            // Guaranteed power-up drop when full group killed
            this.dropPowerUp(event.x, event.y);
          }
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
        this.updateShieldVisual();
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

      case 'asteroid_hit':
        this.audio.play('hit');
        if (event.killed) {
          this.audio.play('explosion');
          this.particleSystem.emitExplosion(event.x, event.y, 0x886644, 'medium');
          const pts = this.scoreManager.addKill(event.asteroid!.scoreValue);
          this.spawnScorePopup(event.x, event.y, pts);
        } else {
          this.particleSystem.emitExplosion(event.x, event.y, 0x665544, 'small');
        }
        break;

      case 'asteroid_contact': {
        const dead = this.player.hit();
        this.updateShieldVisual();
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
    }
  }

  private handleEnemyShooting(): void {
    // Enemy shooting is handled by WeaponSystem
  }

  private dropPowerUp(x: number, y: number): void {
    const types: PowerUpType[] = ['triple', 'parallel', 'circle', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pu = this.powerUpPool.get();
    pu.init(x, y, type);
    this.gameContainer.addChild(pu.container);
  }

  private applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case 'triple':
        this.player.upgradeWeapon('triple');
        break;
      case 'parallel':
        this.player.upgradeWeapon('parallel');
        break;
      case 'circle':
        this.player.upgradeWeapon('circle');
        break;
      case 'shield':
        this.player.shieldHits = 3;
        this.updateShieldVisual();
        break;
    }
  }

  private updateShieldVisual(): void {
    this.shieldBubble.clear();
    if (this.player.shieldHits > 0) {
      const alpha = 0.2 + this.player.shieldHits * 0.1;
      this.shieldBubble
        .circle(0, 0, 28)
        .stroke({ color: COLORS.shield, width: 2, alpha: 0.8 })
        .circle(0, 0, 28)
        .fill({ color: COLORS.shield, alpha });
      this.shieldBubble.visible = true;
    } else {
      this.shieldBubble.visible = false;
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
    this.audio.startMusic('boss');

    // Clear remaining enemies
    this.enemyPool.releaseAll();

    // Create boss
    this.boss = new Boss();
    this.boss.init(this.levelManager.getBossType());
    this.gameContainer.addChild(this.boss.container);
  }

  // Asteroids
  private updateAsteroids(dt: number): void {
    // Spawn timer
    this.asteroidSpawnTimer -= dt;
    if (this.asteroidSpawnTimer <= 0) {
      this.spawnAsteroid();
      this.asteroidSpawnTimer = this.asteroidSpawnInterval + Math.random() * 2;
    }

    // Update existing asteroids
    const toRelease: Asteroid[] = [];
    for (const asteroid of this.asteroidPool.active) {
      asteroid.update(dt);
      if (asteroid.x < -60) {
        toRelease.push(asteroid);
      }
    }
    toRelease.forEach((a) => this.asteroidPool.release(a));
  }

  private spawnAsteroid(): void {
    const asteroid = this.asteroidPool.get();
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'small', 'medium', 'medium', 'large'];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const y = 40 + Math.random() * (GAME_HEIGHT - 80);
    const speed = 80 + Math.random() * 80;
    asteroid.init(GAME_WIDTH + 40, y, size, speed);
    this.gameContainer.addChild(asteroid.container);
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

  // Dev mode methods
  devJumpToLevel(index: number): void {
    this.cleanup();
    this.levelManager.setLevel(index);
    this.player.levelReset();
    this.gameContainer.addChild(this.player.container);
    this.startLevel();
    this.audio.startMusic('game');
  }

  devSkipToBoss(): void {
    this.spawnSystem.forceComplete();
    this.startBossIntro();
  }
}
