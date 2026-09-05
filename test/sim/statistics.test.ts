import { describe, expect, it } from 'vitest';
import { initialState, simulateShot } from '../../src/sim/duel';
import type { DuelSetup } from '../../src/sim/types';

/** QA.md M0-19 and M0-20: seeded frequency gates for the two chance mechanics. */
describe('chance mechanics over seeded shots', () => {
  it('Liberica wild shot fires at 10% ± 2% over 1000 seeded shots', () => {
    let wild = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const setup: DuelSetup = {
        duelSeed: seed * 2654435761 + 1,
        suddenDeathFrom: null,
        sides: [
          { beanClass: 'liberica', machine: 'moka', stance: 'flood' },
          { beanClass: 'arabica', machine: 'moka', stance: 'flood' },
        ],
      };
      const r = simulateShot(setup, initialState(setup), {
        turnIndex: 0,
        angleDeciDeg: 450,
        powerPerMille: 600,
        ammo: 'green',
        doubleShot: false,
      });
      if (r.wildShot) wild += 1;
    }
    expect(wild).toBeGreaterThanOrEqual(80);
    expect(wild).toBeLessThanOrEqual(120);
  });
  it('French press over-hold misfires at 1 in 6 ± 1 in 6 over 600 seeded holds, never below 85%', () => {
    let misfires = 0;
    let below = 0;
    for (let seed = 0; seed < 600; seed++) {
      const setup: DuelSetup = {
        duelSeed: seed * 40503 + 7,
        suddenDeathFrom: null,
        sides: [
          { beanClass: 'arabica', machine: 'press', stance: 'flood' },
          { beanClass: 'arabica', machine: 'moka', stance: 'flood' },
        ],
      };
      const st = initialState(setup);
      const hot = simulateShot(setup, st, {
        turnIndex: 0,
        angleDeciDeg: 450,
        powerPerMille: 950,
        ammo: 'green',
        doubleShot: false,
      });
      if (hot.misfire) misfires += 1;
      const safe = simulateShot(setup, st, {
        turnIndex: 0,
        angleDeciDeg: 450,
        powerPerMille: 800,
        ammo: 'green',
        doubleShot: false,
      });
      if (safe.misfire) below += 1;
    }
    expect(misfires).toBeGreaterThanOrEqual(60);
    expect(misfires).toBeLessThanOrEqual(140);
    expect(below).toBe(0);
  });
});
