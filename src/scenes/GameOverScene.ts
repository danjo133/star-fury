import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from '../types/index';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { InputManager } from '../managers/InputManager';
import { ScoreManager } from '../managers/ScoreManager';

export class GameOverScene implements Scene {
  public container: Container;
  private input: InputManager;
  private scoreManager: ScoreManager;
  private finalScore: number;
  private onRestart: () => void;
  private blinkTimer = 0;
  private promptText!: Text;
  private stars: { g: Graphics; speed: number }[] = [];

  constructor(input: InputManager, scoreManager: ScoreManager, finalScore: number, onRestart: () => void) {
    this.container = new Container();
    this.input = input;
    this.scoreManager = scoreManager;
    this.finalScore = finalScore;
    this.onRestart = onRestart;
    this.create();
  }

  private create(): void {
    // Background stars (dimmer)
    for (let i = 0; i < 30; i++) {
      const star = new Graphics();
      star.rect(0, 0, 1, 1).fill({ color: COLORS.star });
      star.alpha = 0.2;
      star.x = Math.random() * GAME_WIDTH;
      star.y = Math.random() * GAME_HEIGHT;
      this.container.addChild(star);
      this.stars.push({ g: star, speed: 10 + Math.random() * 20 });
    }

    // Game Over text
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 42,
      fill: 0xff4444,
      fontWeight: 'bold',
    });
    const title = new Text({ text: 'GAME OVER', style: titleStyle });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 180;
    this.container.addChild(title);

    // Score
    const scoreStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fill: 0xffffff,
    });
    const scoreText = new Text({ text: `SCORE: ${this.finalScore}`, style: scoreStyle });
    scoreText.anchor.set(0.5);
    scoreText.x = GAME_WIDTH / 2;
    scoreText.y = 260;
    this.container.addChild(scoreText);

    // Hi-Score
    const isNewHi = this.finalScore >= this.scoreManager.hiScore;
    const hiStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: isNewHi ? 0xffff00 : 0x888888,
    });
    const hiText = new Text({
      text: isNewHi ? 'NEW HI-SCORE!' : `HI-SCORE: ${this.scoreManager.hiScore}`,
      style: hiStyle,
    });
    hiText.anchor.set(0.5);
    hiText.x = GAME_WIDTH / 2;
    hiText.y = 300;
    this.container.addChild(hiText);

    // Prompt
    const promptStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: 0xffffff,
    });
    this.promptText = new Text({ text: 'PRESS SPACE TO PLAY AGAIN', style: promptStyle });
    this.promptText.anchor.set(0.5);
    this.promptText.x = GAME_WIDTH / 2;
    this.promptText.y = 400;
    this.container.addChild(this.promptText);
  }

  enter(): void {
    this.blinkTimer = 0;
  }

  exit(): void {}

  update(dt: number): void {
    this.blinkTimer += dt;
    this.promptText.visible = Math.sin(this.blinkTimer * 4) > 0;

    for (const star of this.stars) {
      star.g.x -= star.speed * dt;
      if (star.g.x < -5) {
        star.g.x = GAME_WIDTH + 5;
        star.g.y = Math.random() * GAME_HEIGHT;
      }
    }

    if (this.input.confirm) {
      this.onRestart();
    }
  }
}
