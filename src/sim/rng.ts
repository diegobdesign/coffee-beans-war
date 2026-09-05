/**
 * Deterministic PRNG for the sim. Integer arithmetic only; identical on every engine.
 * fnv1a32 turns strings into seeds; mulberry32 is the stream.
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Rng {
  /** uniform float in [0, 1) */
  next(): number;
  /** uniform integer in [0, n) */
  int(n: number): number;
  /** the raw uint32 */
  u32(): number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const u32 = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return {
    u32,
    next: () => u32() / 4294967296,
    int: (n) => u32() % n,
  };
}

/** One independent stream per turn, derived from the duel seed and the turn index. */
export function turnRng(duelSeed: number, turnIndex: number): Rng {
  return mulberry32(fnv1a32(`${String(duelSeed >>> 0)}:${String(turnIndex)}`));
}
