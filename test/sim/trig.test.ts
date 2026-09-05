import { describe, expect, it } from 'vitest';
import { cosDeciDeg, sinDeciDeg } from '../../src/sim/trig';
import { SIN_TABLE } from '../../src/sim/trig.table';

describe('trig table', () => {
  it('has 901 entries from 0 to 1', () => {
    expect(SIN_TABLE).toHaveLength(901);
    expect(SIN_TABLE[0]).toBe(0);
    expect(SIN_TABLE[900]).toBe(1);
  });
  it('folds every quadrant and negative angles', () => {
    expect(sinDeciDeg(0)).toBe(0);
    expect(sinDeciDeg(900)).toBe(1);
    expect(sinDeciDeg(1800)).toBe(0);
    expect(sinDeciDeg(2700)).toBe(-1);
    expect(sinDeciDeg(-900)).toBe(-1);
    expect(sinDeciDeg(-150)).toBe(-sinDeciDeg(150));
    expect(sinDeciDeg(450)).toBeCloseTo(Math.SQRT1_2, 12);
    expect(cosDeciDeg(0)).toBe(1);
    expect(cosDeciDeg(600)).toBe(sinDeciDeg(300));
  });
  it('is bit-identical to itself across calls (no state)', () => {
    for (let d = -3600; d <= 3600; d += 37) {
      expect(sinDeciDeg(d)).toBe(sinDeciDeg(d));
    }
  });
});
