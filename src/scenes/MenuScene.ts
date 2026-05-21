import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from '../types/index';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { InputManager } from '../managers/InputManager';
import { ScoreManager } from '../managers/ScoreManager';

export class MenuScene implements Scene {
  public container: Container;
  private blinkTimer = 0;
  private promptText!: Text;
  private stars: { g: Graphics; speed: number }[] = [];
  private input: InputManager;
  private scoreManager: ScoreManager;
  private onStart: () => void;

  constructor(input: InputManager, scoreManager: ScoreManager, onStart: () => void) {
    this.container = new Container();
    this.input = input;
    this.scoreManager = scoreManager;
    this.onStart = onStart;
    this.create();
  }

  private create(): void {
    // Background stars
    for (let i = 0; i < 60; i++) {
      const star = new Graphics();
      const size = Math.random() * 2 + 0.5;
      star.rect(0, 0, size, size).fill({ color: COLORS.star });
      star.alpha = Math.random() * 0.5 + 0.3;
      star.x = Math.random() * GAME_WIDTH;
      star.y = Math.random() * GAME_HEIGHT;
      this.container.addChild(star);
      this.stars.push({ g: star, speed: 20 + Math.random() * 40 });
    }

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 48,
      fill: COLORS.player,
      fontWeight: 'bold',
      letterSpacing: 4,
    });
    const title = new Text({ text: 'STAR FURY', style: titleStyle });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 180;
    this.container.addChild(title);

    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0x888888,
    });
    const subtitle = new Text({ text: 'A RETRO SPACE SHOOTER', style: subStyle });
    subtitle.anchor.set(0.5);
    subtitle.x = GAME_WIDTH / 2;
    subtitle.y = 230;
    this.container.addChild(subtitle);

    // Prompt
    const promptStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: 0xffffff,
    });
    this.promptText = new Text({ text: 'PRESS SPACE TO START', style: promptStyle });
    this.promptText.anchor.set(0.5);
    this.promptText.x = GAME_WIDTH / 2;
    this.promptText.y = 350;
    this.container.addChild(this.promptText);

    // Controls
    const controlsStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0x666666,
      align: 'center',
    });
    const controls = new Text({
      text: 'WASD / ARROWS - MOVE\nSPACE / Z - SHOOT\nGAMEPAD SUPPORTED',
      style: controlsStyle,
    });
    controls.anchor.set(0.5);
    controls.x = GAME_WIDTH / 2;
    controls.y = 440;
    this.container.addChild(controls);

    // Hi-Score
    const hiScoreStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xffff00,
    });
    const hiScore = new Text({
      text: `HI-SCORE: ${this.scoreManager.hiScore}`,
      style: hiScoreStyle,
    });
    hiScore.anchor.set(0.5);
    hiScore.x = GAME_WIDTH / 2;
    hiScore.y = 520;
    this.container.addChild(hiScore);

    // Decorative ship
    const ship = new Graphics();
    ship
      .poly([
        { x: 16, y: 0 },
        { x: -8, y: -6 },
        { x: -12, y: -4 },
        { x: -12, y: 4 },
        { x: -8, y: 6 },
      ])
      .fill({ color: COLORS.player });
    ship.x = GAME_WIDTH / 2;
    ship.y = 290;
    this.container.addChild(ship);
  }

  enter(): void {
    // Reset blink
    this.blinkTimer = 0;
  }

  exit(): void {}

  update(dt: number): void {
    // Blink prompt
    this.blinkTimer += dt;
    this.promptText.visible = Math.sin(this.blinkTimer * 4) > 0;

    // Background scrolling
    for (const star of this.stars) {
      star.g.x -= star.speed * dt;
      if (star.g.x < -5) {
        star.g.x = GAME_WIDTH + 5;
        star.g.y = Math.random() * GAME_HEIGHT;
      }
    }

    // Start game
    if (this.input.confirm) {
      this.onStart();
    }
  }
}
