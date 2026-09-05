import { describe, expect, it } from 'vitest';
import {
  angleDeciDegFromDrag,
  dragRadius,
  originBand,
  powerPerMilleFromDrag,
} from '../../src/ui/input/aim-math';

describe('aim math (UX.md §13.5)', () => {
  it('drag radius is 40% of the shorter side', () => {
    expect(dragRadius(390, 844)).toBe(156);
    expect(dragRadius(844, 390)).toBe(156);
  });
  it('power is linear and clamped to 0..1000', () => {
    expect(powerPerMilleFromDrag(0, 156)).toBe(0);
    expect(powerPerMilleFromDrag(78, 156)).toBe(500);
    expect(powerPerMilleFromDrag(156, 156)).toBe(1000);
    expect(powerPerMilleFromDrag(500, 156)).toBe(1000);
    expect(powerPerMilleFromDrag(-5, 156)).toBe(0);
  });
  it('angle is clamped to -150..900 deci-degrees, dy positive is downward', () => {
    expect(angleDeciDegFromDrag(100, 0)).toBe(0);
    expect(angleDeciDegFromDrag(0, -100)).toBe(900);
    expect(angleDeciDegFromDrag(100, -100)).toBe(450);
    expect(angleDeciDegFromDrag(-100, -100)).toBe(900);
    expect(angleDeciDegFromDrag(100, 100)).toBe(-150);
    expect(angleDeciDegFromDrag(100, 10)).toBe(-57);
  });
  it('origin band is 28% to 65% in portrait and excludes the HUD strip in landscape', () => {
    const p = originBand(390, 844);
    expect(p.top).toBeCloseTo(236.3, 0);
    expect(p.bottom).toBeCloseTo(548.6, 0);
    const l = originBand(844, 390);
    expect(l.top).toBe(64);
    expect(l.bottom).toBe(390 - 96 - 56);
  });
});
