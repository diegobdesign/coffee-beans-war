import { fnv1a32, mulberry32 } from './rng';
import { SIDE_X, STAGE_WIDTH, STANCE } from './rules';
import type { DuelSetup, Side } from './types';

/**
 * The duel stage as a height profile over x in [0, STAGE_WIDTH] at 0.25 spacing (113 samples),
 * plus the canopy obstacles for tree stances. Pure, seeded by a build constant, never the daily seed
 * (ARCHITECTURE §3.3). Sampled with value noise built on mulberry32: no Math.sin anywhere.
 */
export const TERRAIN_SEED = 0xc0ffee01;
export const SAMPLE_SPACING = 0.25;
export const SAMPLES = STAGE_WIDTH / SAMPLE_SPACING + 1;

export interface Canopy {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly side: Side;
}

export interface Stage {
  readonly heights: Float64Array;
  readonly canopies: readonly Canopy[];
  readonly beanX: readonly [number, number];
  readonly beanY: readonly [number, number];
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lattice(seed: number, i: number): number {
  return mulberry32(fnv1a32(`${String(seed)}:${String(i)}`)).next();
}

/** 1D value noise in [0,1], integer lattice, polynomial smoothing. */
export function valueNoise(seed: number, x: number): number {
  const i0 = Math.floor(x);
  const t = smooth(x - i0);
  const a = lattice(seed, i0);
  const b = lattice(seed, i0 + 1);
  return a + (b - a) * t;
}

function platform(x: number, bx: number, h: number, base: number): number {
  const d = Math.abs(x - bx);
  if (d <= 1.5) return h;
  if (d >= 4.5) return base;
  const t = smooth((d - 1.5) / 3);
  return h + (base - h) * t;
}

export function buildStage(setup: DuelSetup): Stage {
  const [s0, s1] = setup.sides;
  const h0 = STANCE[s0.stance].height;
  const h1 = STANCE[s1.stance].height;
  const heights = new Float64Array(SAMPLES);
  const canopies: Canopy[] = [];
  const stanceKey = `${s0.stance}:${s1.stance}`;
  const noiseSeed = fnv1a32(`${String(TERRAIN_SEED)}:${stanceKey}`);

  for (let i = 0; i < SAMPLES; i++) {
    const x = i * SAMPLE_SPACING;
    // base valley between the platforms: a gentle blend plus low amplitude noise
    const t = smooth(Math.min(1, Math.max(0, (x - SIDE_X[0]) / (SIDE_X[1] - SIDE_X[0]))));
    const blend = h0 + (h1 - h0) * t;
    const base = blend * 0.5 + (valueNoise(noiseSeed, x * 0.5) - 0.5) * 0.8;
    const p0 = platform(x, SIDE_X[0], h0, base);
    const p1 = platform(x, SIDE_X[1], h1, base);
    let h = Math.abs(x - SIDE_X[0]) <= Math.abs(x - SIDE_X[1]) ? p0 : p1;
    // rock lip in front of a mountain bean: 0.5 tall, 1.0..1.5 units toward the opponent
    if (s0.stance === 'mountain' && x >= SIDE_X[0] + 1.0 && x <= SIDE_X[0] + 1.5) h += 0.5;
    if (s1.stance === 'mountain' && x >= SIDE_X[1] - 1.5 && x <= SIDE_X[1] - 1.0) h += 0.5;
    heights[i] = Math.max(0, h);
  }

  if (s0.stance === 'tree') canopies.push({ x: SIDE_X[0] - 0.4, y: h0 + 1.6, r: 1.0, side: 0 });
  if (s1.stance === 'tree') canopies.push({ x: SIDE_X[1] + 0.4, y: h1 + 1.6, r: 1.0, side: 1 });

  return { heights, canopies, beanX: SIDE_X, beanY: [h0, h1] };
}

/** Linear interpolation over the profile. Off-stage x clamps to the edge sample. */
export function heightAt(stage: Stage, x: number): number {
  const f = x / SAMPLE_SPACING;
  const i0 = Math.max(0, Math.min(SAMPLES - 2, Math.floor(f)));
  const t = Math.max(0, Math.min(1, f - i0));
  const a = stage.heights[i0];
  const b = stage.heights[i0 + 1];
  if (a === undefined || b === undefined) throw new Error('stage sample miss');
  return a + (b - a) * t;
}
