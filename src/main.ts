import { startClock } from './core/clock';
import { env } from './core/env';
import { createDuelView, sideLabel } from './render/duel/view';
import { TOKENS } from './render/tokens';
import { steamAt } from './sim/duel';
import { fnv1a32 } from './sim/rng';
import type { DuelSetup } from './sim/types';
import { createDuelHud } from './ui/screens/duel';
import { chip } from './ui/components/chip';

const canvas = document.getElementById('gl');
const app = document.getElementById('app');
if (!(canvas instanceof HTMLCanvasElement) || app === null) {
  throw new Error('boot: missing #gl or #app');
}

// Slice 3: a static stage. The scripted first matchup: you on the Ridge, a Brew bot across the lake.
const setup: DuelSetup = {
  duelSeed: fnv1a32('cbw:m0:slice3'),
  suddenDeathFrom: null,
  sides: [
    { beanClass: 'arabica', machine: 'moka', stance: 'mountain' },
    { beanClass: 'robusta', machine: 'press', stance: 'flood' },
  ],
};

const view = createDuelView(canvas, setup, {
  roast: [TOKENS.roast.light, TOKENS.roast.dark],
  accent: [0xe8b86d, 0x7fa7c4],
});
const hud = createDuelHud(app);
hud.setTurn('YOUR SHOT.  ·  VS DECAF DAN');
hud.setSteam(steamAt(setup, 0));
hud.setStances(sideLabel(setup, 0), sideLabel(setup, 1));
if (!env.online) app.append(chip('NO STEAM. THE BOTS ARE STILL HERE.', 'chip--br', 'chip--dim'));

startClock((f) => {
  view.frame(f);
});
