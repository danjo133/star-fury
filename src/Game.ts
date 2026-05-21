import { Application, Container } from 'pixi.js';
import { Scene } from './types/index';
import { InputManager } from './managers/InputManager';
import { AudioManager } from './managers/AudioManager';
import { ScoreManager } from './managers/ScoreManager';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { CRTFilter } from './effects/CRTFilter';
import { FIXED_TIMESTEP, GAME_HEIGHT, GAME_WIDTH, MAX_DELTA } from './utils/constants';

export class Game {
  private app: Application;
  private sceneContainer: Container;
  private currentScene: Scene | null = null;

  private input: InputManager;
  private audio: AudioManager;
  private scoreManager: ScoreManager;
  private crtFilter: CRTFilter;

  private lastTime = 0;
  private accumulator = 0;
  private running = false;
  private devMode = false;

  constructor(app: Application) {
    this.app = app;
    this.sceneContainer = new Container();
    this.app.stage.addChild(this.sceneContainer);

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.scoreManager = new ScoreManager();
    this.crtFilter = new CRTFilter();
    this.crtFilter.setResolution(GAME_WIDTH, GAME_HEIGHT);

    // Apply CRT filter to the whole stage
    this.app.stage.filters = [this.crtFilter];
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.input.attachCanvas(this.app.canvas);
    this.showMenu();
    this.app.ticker.add(() => this.gameLoop());

    // Key binding: press 'M' to toggle between synth engines
    // Key binding: press 'N' to switch game music track
    // Key binding: press 'O' to toggle dev mode
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) {
        this.audio.toggleEngine().then((engine) => {
          console.log(`Audio engine: ${engine === 'sidemulator' ? 'SID Emulator' : 'Web Audio Synth'}`);
        });
      }
      if (e.code === 'KeyN' && !e.repeat) {
        const title = this.audio.nextGameTrack();
        console.log(`Now playing: ${title}`);
      }
      if (e.code === 'KeyO' && !e.repeat) {
        this.devMode = !this.devMode;
        console.log(`Dev mode: ${this.devMode ? 'ON' : 'OFF'}`);
      }
      // Dev mode: number keys 1-9,0 to jump to level, B for boss
      if (this.devMode && !e.repeat && this.currentScene instanceof GameScene) {
        const gameScene = this.currentScene as GameScene;
        const levelKeys: Record<string, number> = {
          'Digit1': 0, 'Digit2': 1, 'Digit3': 2, 'Digit4': 3, 'Digit5': 4,
          'Digit6': 5, 'Digit7': 6, 'Digit8': 7, 'Digit9': 8, 'Digit0': 9,
        };
        if (e.code in levelKeys) {
          gameScene.devJumpToLevel(levelKeys[e.code]);
          console.log(`Dev: jumped to level ${levelKeys[e.code] + 1}`);
        }
        if (e.code === 'KeyB') {
          gameScene.devSkipToBoss();
          console.log('Dev: skipping to boss');
        }
      }
    });
  }

  private gameLoop(): void {
    if (!this.running) return;

    const now = performance.now();
    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp delta to prevent spiral of death
    if (delta > MAX_DELTA) delta = MAX_DELTA;

    // Update music sequencer with real time (not fixed step) for smooth audio
    this.audio.update(delta);

    this.accumulator += delta;

    // Fixed timestep updates
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.currentScene?.update(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }

    // Clear input frame state after updates
    this.input.clearFrame();

    // Update CRT filter
    this.crtFilter.update(delta);
  }

  private switchScene(scene: Scene): void {
    if (this.currentScene) {
      this.currentScene.exit();
      this.sceneContainer.removeChild(this.currentScene.container);
    }
    this.currentScene = scene;
    this.sceneContainer.addChild(scene.container);
    scene.enter();
  }

  private showMenu(): void {
    const menuScene = new MenuScene(this.input, this.scoreManager, () => {
      this.audio.play('menu_select');
      this.startGame();
    });
    this.switchScene(menuScene);
    this.audio.startMusic('title');
  }

  private startGame(): void {
    const gameScene = new GameScene(this.input, this.audio, this.scoreManager, (score: number) => {
      this.showGameOver(score);
    });
    this.switchScene(gameScene);
  }

  private showGameOver(score: number): void {
    const gameOverScene = new GameOverScene(this.input, this.scoreManager, score, () => {
      this.audio.play('menu_select');
      this.startGame();
    });
    this.switchScene(gameOverScene);
    this.audio.startMusic('gameover');
  }
}
