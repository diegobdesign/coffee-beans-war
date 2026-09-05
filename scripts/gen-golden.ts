/**
 * Emits test/golden/vectors.json: 500 (setup, turns) -> per-turn hash chains.
 * Covers all 9 stance pairs, 3 classes, 4 machines, 4 ammo types, steam extremes, boundary angles.
 * Regenerate ONLY when a balance knob in src/sim/rules.ts changes, and say so in the commit.
 */
import { applyShot, initialState, simulateShot } from '../src/sim/duel';
import { mulberry32 } from '../src/sim/rng';
import type { Ammo, BeanClass, DuelSetup, Machine, Stance, TurnInput } from '../src/sim/types';

const STANCES: Stance[] = ['mountain', 'tree', 'flood'];
const CLASSES: BeanClass[] = ['arabica', 'robusta', 'liberica'];
const MACHINES: Machine[] = ['moka', 'press', 'espresso', 'aeropress'];
const AMMOS: Ammo[] = ['green', 'dark', 'ground', 'cup'];
const ANGLES = [-150, 0, 50, 300, 450, 600, 850, 900];
const POWERS = [0, 1, 250, 500, 850, 999, 1000];

const rng = mulberry32(0xc0ffee);
const pick = <T>(arr: readonly T[]): T => {
  const v = arr[rng.int(arr.length)];
  if (v === undefined) throw new Error('empty');
  return v;
};

interface Vector {
  setup: DuelSetup;
  turns: TurnInput[];
  hashes: number[];
  final: { hp: [number, number]; outcome: string; impacts: number };
}

const vectors: Vector[] = [];
let n = 0;
while (vectors.length < 500) {
  const s0 = STANCES[n % 3];
  const s1 = STANCES[Math.floor(n / 3) % 3];
  if (s0 === undefined || s1 === undefined) throw new Error('stance');
  const setup: DuelSetup = {
    duelSeed: rng.u32(),
    suddenDeathFrom: n % 17 === 0 ? 2 : null,
    sides: [
      { beanClass: pick(CLASSES), machine: pick(MACHINES), stance: s0 },
      { beanClass: pick(CLASSES), machine: pick(MACHINES), stance: s1 },
    ],
  };
  const turns: TurnInput[] = [];
  const hashes: number[] = [];
  let state = initialState(setup);
  const len = 1 + rng.int(6);
  for (let i = 0; i < len && state.outcome === 'active'; i++) {
    let ammo = pick(AMMOS);
    const rack = state.ammoLeft[state.toMove];
    if (ammo === 'dark' && rack.dark === 0) ammo = 'green';
    if (ammo === 'ground' && rack.ground === 0) ammo = 'green';
    if (ammo === 'cup' && rack.cup === 0) ammo = 'green';
    const t: TurnInput = {
      turnIndex: i,
      angleDeciDeg: n % 5 === 0 ? pick(ANGLES) : -150 + rng.int(1051),
      powerPerMille: n % 7 === 0 ? pick(POWERS) : rng.int(1001),
      ammo,
      doubleShot: rng.int(4) === 0,
    };
    const r = simulateShot(setup, state, t);
    turns.push(t);
    hashes.push(r.hash);
    state = applyShot(setup, state, t, r);
  }
  vectors.push({
    setup,
    turns,
    hashes,
    final: {
      hp: [state.hp[0], state.hp[1]],
      outcome: state.outcome,
      impacts: state.impacts.length,
    },
  });
  n++;
}
process.stdout.write(
  JSON.stringify({ generated: 'scripts/gen-golden.ts', count: vectors.length, vectors }, null, 0) +
    '\n',
);
