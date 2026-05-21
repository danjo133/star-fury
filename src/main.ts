import { Application } from 'pixi.js';
import { Game } from './Game';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

function scaleCanvas(canvas: HTMLCanvasElement): void {
  const scaleX = window.innerWidth / GAME_WIDTH;
  const scaleY = window.innerHeight / GAME_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  const width = Math.floor(GAME_WIDTH * scale);
  const height = Math.floor(GAME_HEIGHT * scale);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

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
  scaleCanvas(app.canvas);
  window.addEventListener('resize', () => scaleCanvas(app.canvas));

  const game = new Game(app);
  game.start();
}

init().catch(console.error);
