import { Application } from 'pixi.js';
import { Game } from './Game';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

async function init(): Promise<void> {
  const app = new Application();

  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x000000,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.canvas);

  const game = new Game(app);
  game.start();
}

init().catch(console.error);
