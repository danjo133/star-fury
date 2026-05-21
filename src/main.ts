import { Application } from 'pixi.js';
import { Game } from './Game';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

function scaleCanvas(canvas: HTMLCanvasElement): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isPortrait = vh > vw;

  if (isPortrait) {
    // Portrait: game fills width, leave room for controls below
    const scale = vw / GAME_WIDTH;
    const gameHeight = Math.floor(GAME_HEIGHT * scale);
    const controlsHeight = vh - gameHeight;
    // If controls area would be too small, shrink game to guarantee space
    const minControlsHeight = 160;
    const finalScale = controlsHeight < minControlsHeight
      ? (vh - minControlsHeight) / GAME_HEIGHT
      : scale;
    const width = Math.floor(GAME_WIDTH * finalScale);
    const height = Math.floor(GAME_HEIGHT * finalScale);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  } else {
    // Landscape: fit to screen
    const scaleX = vw / GAME_WIDTH;
    const scaleY = vh / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const width = Math.floor(GAME_WIDTH * scale);
    const height = Math.floor(GAME_HEIGHT * scale);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
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
