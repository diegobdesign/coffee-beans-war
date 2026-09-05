import { describe, expect, it } from 'vitest';
import { initialEstimate, updateEstimate } from '../../src/bots/estimate';
import { solveAim } from '../../src/bots/solver';
import { applyShot, initialState, simulateShot } from '../../src/sim/duel';
import { SIDE_X } from '../../src/sim/rules';
import type { DuelSetup, Stance } from '../../src/sim/types';

function setup(s0: Stance, s1: Stance, seed: number): DuelSetup {
  return {
    duelSeed: seed,
    suddenDeathFrom: null,
    sides: [
      { beanClass: 'arabica', machine: 'moka', stance: s0 },
      { beanClass: 'arabica', machine: 'moka', stance: s1 },
    ],
  };
}

describe('bot solver', () => {
  it('estimate updates move toward the target in stage space', () => {
    const e = initialEstimate(SIDE_X[0], 2.5);
    const s = updateEstimate(e, 1, 9, 'short');
    expect(s.x).toBeLessThan(e.x);
    const l = updateEstimate(e, 1, 2, 'long');
    expect(l.x).toBeGreaterThan(e.x);
    const c = updateEstimate(e, 1, 4.2, 'close');
    expect(c.x).toBe(4.2);
    expect(c.sigma).toBeLessThan(e.sigma);
  });
  it('a noiseless bot with a perfect estimate lands within close radius of the player', () => {
    for (const [a, b] of [
      ['flood', 'flood'],
      ['mountain', 'flood'],
      ['flood', 'mountain'],
      ['tree', 'tree'],
    ] as const) {
      const s = setup(a, b, 31);
      let st = initialState(s);
      const p = {
        turnIndex: 0,
        angleDeciDeg: 450,
        powerPerMille: 500,
        ammo: 'green' as const,
        doubleShot: false,
      };
      st = applyShot(s, st, p, simulateShot(s, st, p));
      const shot = solveAim(s, st, 1, { x: SIDE_X[0], sigma: 0.4 }, 0);
      const r = simulateShot(s, st, shot);
      expect(r.call).toBe('close');
    }
  });
  it('a noiseless bot walks in from a biased estimate within four shots', () => {
    const s = setup('flood', 'flood', 12);
    let st = initialState(s);
    let est = initialEstimate(SIDE_X[0], 3.0);
    let closeAt: number | null = null;
    for (let i = 0; i < 8 && st.outcome === 'active'; i++) {
      const p = {
        turnIndex: st.turnIndex,
        angleDeciDeg: 800,
        powerPerMille: 100,
        ammo: 'green' as const,
        doubleShot: false,
      };
      st = applyShot(s, st, p, simulateShot(s, st, p));
      if (st.outcome !== 'active') break;
      const shot = solveAim(s, st, 1, est, 0);
      const r = simulateShot(s, st, shot);
      const primary = r.impacts[0];
      if (primary !== undefined) est = updateEstimate(est, 1, primary.x, r.call);
      st = applyShot(s, st, shot, r);
      if (r.call === 'close' && closeAt === null) closeAt = i;
    }
    expect(closeAt).not.toBeNull();
    expect(closeAt ?? 99).toBeLessThanOrEqual(3);
  });
  it('is deterministic', () => {
    const s = setup('mountain', 'tree', 5);
    let st = initialState(s);
    const p = {
      turnIndex: 0,
      angleDeciDeg: 450,
      powerPerMille: 600,
      ammo: 'green' as const,
      doubleShot: false,
    };
    st = applyShot(s, st, p, simulateShot(s, st, p));
    const e = initialEstimate(SIDE_X[0], -1.2);
    expect(solveAim(s, st, 1, e, 6)).toEqual(solveAim(s, st, 1, e, 6));
  });
});
