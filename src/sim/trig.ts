import { SIN_TABLE } from './trig.table';

/**
 * Sine and cosine over a committed table, in deci-degrees (1 unit = 0.1 degree).
 * Any integer angle is accepted; it is folded into the first quadrant with integer arithmetic.
 * Non-integer inputs are truncated: the sim quantises angles before they reach here.
 */
function fold(deciDeg: number): { index: number; sign: number } {
  let a = Math.trunc(deciDeg) % 3600;
  if (a < 0) a += 3600;
  // quadrant fold: 0..900 rises, 900..1800 falls, 1800..2700 negative rising, 2700..3600 negative falling
  if (a <= 900) return { index: a, sign: 1 };
  if (a <= 1800) return { index: 1800 - a, sign: 1 };
  if (a <= 2700) return { index: a - 1800, sign: -1 };
  return { index: 3600 - a, sign: -1 };
}

export function sinDeciDeg(deciDeg: number): number {
  const { index, sign } = fold(deciDeg);
  const v = SIN_TABLE[index];
  if (v === undefined) throw new Error(`trig table miss at ${String(index)}`);
  return sign * v;
}

export function cosDeciDeg(deciDeg: number): number {
  return sinDeciDeg(deciDeg + 900);
}
