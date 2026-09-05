import type { Roast } from './types';

/** Local record until M2 brings the server (ARCHITECTURE §6). RP, duels, streak. */
export interface Profile {
  rp: number;
  duels: number;
  wins: number;
  streak: number;
  bestStreak: number;
}

const KEY = 'cbw:profile:v1';

export const ROAST_THRESHOLDS: readonly [Roast, number][] = [
  ['green', 0],
  ['light', 50],
  ['medium', 150],
  ['dark', 350],
  ['burnt', 700],
];

export function roastFor(rp: number): Roast {
  let r: Roast = 'green';
  for (const [name, min] of ROAST_THRESHOLDS) if (rp >= min) r = name;
  return r;
}

export function nextThreshold(rp: number): number | null {
  for (const [, min] of ROAST_THRESHOLDS) if (rp < min) return min;
  return null;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const p: unknown = JSON.parse(raw);
      if (typeof p === 'object' && p !== null && 'rp' in p && typeof p.rp === 'number')
        return p as Profile;
    }
  } catch {
    // private mode or blocked storage: play with a fresh profile
  }
  return { rp: 0, duels: 0, wins: 0, streak: 0, bestStreak: 0 };
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // nothing to do; the session still plays
  }
}
