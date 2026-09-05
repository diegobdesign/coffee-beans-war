import { startClock } from './core/clock';
import { env } from './core/env';
import { createDuel, type DuelController } from './game/duel';
import { ROSTER, type Bot } from './bots/roster';
import { loadProfile } from './core/profile';
import { TOKENS } from './render/tokens';
import type { Stance } from './sim/types';
import { fnv1a32 } from './sim/rng';
import type { DuelSetup } from './sim/types';
import { chip } from './ui/components/chip';

const canvas = document.getElementById('gl');
const app = document.getElementById('app');
if (!(canvas instanceof HTMLCanvasElement) || app === null) {
  throw new Error('boot: missing #gl or #app');
}

const HEIGHT: Record<Stance, number> = { flood: 0, tree: 1, mountain: 2 };
const ROAST_HEX: Record<Bot['roast'], number> = TOKENS.roast;

/**
 * Opponent selection (GAME-DESIGN §16b ruling 5): a new player's first two picks are Green bots in the
 * same or a lower stance; from then on the roster cycles upward with the roast rank.
 */
function pickBot(duelNo: number, yourStance: Stance): Bot {
  const profile = loadProfile();
  if (profile.duels < 2) {
    const greens = ROSTER.filter(
      (b) => b.roast === 'green' && HEIGHT[b.stance] <= HEIGHT[yourStance],
    );
    const g = greens[duelNo % Math.max(1, greens.length)] ?? ROSTER[0];
    if (g !== undefined) return g;
  }
  const b = ROSTER[duelNo % ROSTER.length];
  if (b === undefined) throw new Error('roster');
  return b;
}

let duelNo = loadProfile().duels;
const YOUR_STANCES: readonly Stance[] = ['mountain', 'mountain', 'tree', 'flood'];
let bot: Bot = ROSTER[0] ?? {
  name: 'Decaf Dan',
  origin: 'CRI',
  beanClass: 'liberica',
  roast: 'green',
  stance: 'flood',
  machine: 'press',
};
const makeSetup = (): DuelSetup => {
  const yourStance = YOUR_STANCES[duelNo % YOUR_STANCES.length] ?? 'mountain';
  bot = pickBot(duelNo, yourStance);
  return {
    duelSeed: fnv1a32(`cbw:local:${String(duelNo)}`),
    suddenDeathFrom: null,
    sides: [
      { beanClass: 'arabica', machine: 'moka', stance: yourStance },
      { beanClass: bot.beanClass, machine: bot.machine, stance: bot.stance },
    ],
  };
};

let duel: DuelController | null = null;
const start = (): void => {
  duel?.dispose();
  app.replaceChildren();
  const setup = makeSetup();
  duel = createDuel(canvas, app, setup, {
    bot,
    duelNo,
    firstDuel: duelNo === 0,
    roast: [ROAST_HEX[loadProfile().rp >= 50 ? 'light' : 'green'], ROAST_HEX[bot.roast]],
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
