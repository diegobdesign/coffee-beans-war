import { mulberry32 } from '../sim/rng';
import type { DuelSetup, DuelState, TurnInput } from '../sim/types';

/**
 * Slice 4 placeholder opponent: a seeded guess with a slow walk-in. Replaced by the solver in slice 6.
 * Pure: same setup + state → same shot.
 */
export function naiveBotShot(setup: DuelSetup, state: DuelState): TurnInput {
  const r = mulberry32((setup.duelSeed ^ 0x6b07) + state.turnIndex * 7919);
  const own = state.impacts.filter((i) => i.firedBy === state.toMove);
  const base = 450 + r.int(200) - 100;
  const power = 650 + r.int(200) - 100 + Math.min(own.length, 4) * 25;
  return {
    turnIndex: state.turnIndex,
    angleDeciDeg: base,
    powerPerMille: Math.min(1000, power),
    ammo: 'green',
    doubleShot: false,
  };
}
