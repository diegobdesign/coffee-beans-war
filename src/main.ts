import { startClock } from './core/clock';
import { env } from './core/env';
import { startSmokeScene } from './render/smoke';

const canvas = document.getElementById('gl');
const app = document.getElementById('app');
if (!(canvas instanceof HTMLCanvasElement) || app === null) {
  throw new Error('boot: missing #gl or #app');
}

const chip = document.createElement('div');
chip.className = 'chip chip--tl';
chip.textContent = 'Coffee Beans War · M0 · Brewing.';
app.append(chip);

const status = document.createElement('div');
status.className = 'chip chip--br chip--dim';
status.textContent = env.online ? 'Steam on.' : 'No steam. The bots are still here.';
app.append(status);

const scene = startSmokeScene(canvas);
startClock((f) => {
  scene.frame(f);
});
