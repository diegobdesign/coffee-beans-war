import { previewTrajectory } from '../sim/duel';
import { gaussian, turnRng } from '../sim/rng';
import { CLASS } from '../sim/rules';
import type { Ammo, DuelSetup, DuelState, Side, TurnInput } from '../sim/types';
import type { Estimate } from './estimate';

const ANGLES = [150, 200, 260, 320, 380, 440, 500, 560, 620, 680, 740, 800];
const BOT_SALT = 0xb07;

function landingX(
  setup: DuelSetup,
  state: DuelState,
  angleDd: number,
  powerPm: number,
  ammo: Ammo,
): number {
  const traj = previewTrajectory(setup, state, {
    turnIndex: state.turnIndex,
    angleDeciDeg: angleDd,
    powerPerMille: powerPm,
    ammo,
    doubleShot: false,
  });
  const n = traj.length / 2;
  return traj[(n - 1) * 2] ?? 0;
}

/** Bisect power for a given angle so the landing x hits the estimate. 16 iterations. */
function bisectPower(
  setup: DuelSetup,
  state: DuelState,
  angleDd: number,
  targetX: number,
  ammo: Ammo,
): number {
  const shooter = state.toMove;
  const forward = shooter === 0 ? 1 : -1;
  let lo = 100;
  let hi = 1000;
  for (let i = 0; i < 16; i++) {
    const mid = Math.round((lo + hi) / 2);
    const x = landingX(setup, state, angleDd, mid, ammo);
    if ((x - targetX) * forward < 0) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

function chooseAmmo(setup: DuelSetup, state: DuelState, self: Side, estimate: Estimate): Ammo {
  const rack = state.ammoLeft[self];
  const target: Side = self === 0 ? 1 : 0;
  const myHp = state.hp[self] / CLASS[setup.sides[self].beanClass].cup;
  if (rack.cup > 0 && myHp < 0.4) return 'cup';
  if (rack.ground > 0 && setup.sides[target].stance === 'tree' && estimate.sigma > 1.5)
    return 'ground';
  if (rack.dark > 0 && estimate.sigma < 1.0) return 'dark';
  return 'green';
}

/**
 * Search over angles, bisect power, then add tier noise around the solution (ARCHITECTURE §5.2).
 * Deterministic: same setup, state, estimate and tier give the same shot.
 */
export function solveAim(
  setup: DuelSetup,
  state: DuelState,
  self: Side,
  estimate: Estimate,
  sigmaDeg: number,
): TurnInput {
  const ammo = chooseAmmo(setup, state, self, estimate);
  let best: { angle: number; power: number; err: number } | null = null;
  for (const angle of ANGLES) {
    const power = bisectPower(setup, state, angle, estimate.x, ammo);
    const err = Math.abs(landingX(setup, state, angle, power, ammo) - estimate.x);
    if (best === null || err < best.err) best = { angle, power, err };
  }
  if (best === null) throw new Error('no candidate');
  const rng = turnRng(setup.duelSeed ^ BOT_SALT, state.turnIndex);
  const jitterDd = Math.round(gaussian(rng) * sigmaDeg * 10);
  const jitterPm = Math.round(gaussian(rng) * 30);
  const angleDeciDeg = Math.max(-150, Math.min(900, best.angle + jitterDd));
  const powerPerMille = Math.max(80, Math.min(1000, best.power + jitterPm));
  return { turnIndex: state.turnIndex, angleDeciDeg, powerPerMille, ammo, doubleShot: false };
}
