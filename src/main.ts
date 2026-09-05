import { startClock } from './core/clock';
import { env } from './core/env';
import { createDuel, type DuelController } from './game/duel';
import { TOKENS } from './render/tokens';
import { fnv1a32 } from './sim/rng';
import type { DuelSetup } from './sim/types';
import { chip } from './ui/components/chip';

const canvas = document.getElementById('gl');
const app = document.getElementById('app');
if (!(canvas instanceof HTMLCanvasElement) || app === null) {
  throw new Error('boot: missing #gl or #app');
}

// The scripted first matchup: you on the Ridge with a moka pot, Decaf Dan in the Brew with a press.
let duelNo = 0;
const makeSetup = (): DuelSetup => ({
  duelSeed: fnv1a32(`cbw:local:${String(duelNo)}`),
  suddenDeathFrom: null,
  sides: [
    { beanClass: 'arabica', machine: 'moka', stance: 'mountain' },
    { beanClass: 'robusta', machine: 'press', stance: 'flood' },
  ],
});

let duel: DuelController | null = null;
const start = (): void => {
  duel?.dispose();
  app.replaceChildren();
  duel = createDuel(canvas, app, makeSetup(), {
    opponentName: 'DECAF DAN',
    firstDuel: duelNo === 0,
    roast: [TOKENS.roast.light, TOKENS.roast.green],
    accent: [0xe8b86d, 0x7fa7c4],
    onOneMoreGo() {
      duelNo += 1;
      start();
    },
  });
  if (!env.online) app.append(chip('NO STEAM. THE BOTS ARE STILL HERE.', 'chip--br', 'chip--dim'));
};
start();

startClock((f) => {
  duel?.frame(f);
});
