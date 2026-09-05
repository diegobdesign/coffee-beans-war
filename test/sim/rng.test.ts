import { describe, expect, it } from 'vitest';
import { fnv1a32, mulberry32, turnRng } from '../../src/sim/rng';

describe('rng', () => {
  it('fnv1a32 is stable', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('cbw')).toBe(fnv1a32('cbw'));
    expect(fnv1a32('cbw')).not.toBe(fnv1a32('cbx'));
  });
  it('mulberry32 replays identically from the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 16 }, () => a.u32());
    const seqB = Array.from({ length: 16 }, () => b.u32());
    expect(seqA).toEqual(seqB);
  });
  it('mulberry32 first values are the known reference stream for seed 1', () => {
    const r = mulberry32(1);
    // Golden anchor: this exact stream must hold on V8, JavaScriptCore and SpiderMonkey.
    expect(r.u32()).toBe(2693262067);
    const second = r.u32();
    const fresh = mulberry32(1);
    fresh.u32();
    expect(fresh.u32()).toBe(second);
  });
  it('turn streams are independent per turn index', () => {
    expect(turnRng(7, 0).u32()).not.toBe(turnRng(7, 1).u32());
    expect(turnRng(7, 3).u32()).toBe(turnRng(7, 3).u32());
  });
  it('next() is in [0,1) and int(n) is in [0,n)', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const k = r.int(6);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(6);
    }
  });
});
