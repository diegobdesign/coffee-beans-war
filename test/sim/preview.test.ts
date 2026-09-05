import { describe, expect, it } from 'vitest';
import { initialState, previewTrajectory, simulateShot } from '../../src/sim/duel';
import type { DuelSetup, TurnInput } from '../../src/sim/types';

describe('previewTrajectory', () => {
  it('matches the real shot exactly for a spread-free class with no misfire', () => {
    const setup: DuelSetup = {
      duelSeed: 77,
      suddenDeathFrom: null,
      sides: [
        { beanClass: 'arabica', machine: 'moka', stance: 'mountain' },
        { beanClass: 'robusta', machine: 'press', stance: 'flood' },
      ],
    };
    const st = initialState(setup);
    const input: TurnInput = {
      turnIndex: 0,
      angleDeciDeg: 520,
      powerPerMille: 740,
      ammo: 'green',
      doubleShot: false,
    };
    const preview = previewTrajectory(setup, st, input);
    const real = simulateShot(setup, st, input).trajectories[0];
    expect(real).toBeDefined();
    expect(Array.from(preview)).toEqual(Array.from(real ?? []));
  });
});
