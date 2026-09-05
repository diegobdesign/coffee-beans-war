import { BEAN_RADIUS, DT, GRAVITY, MAX_STEPS, STAGE_WIDTH } from './rules';
import { heightAt, type Canopy, type Stage } from './terrain';
import type { ImpactKind, Side } from './types';

export interface Projectile {
  readonly x0: number;
  readonly y0: number;
  readonly vx0: number;
  readonly vy0: number;
  /** horizontal acceleration from steam, already divided by mass */
  readonly ax: number;
}

export interface Flight {
  readonly trajectory: Float64Array;
  readonly steps: number;
  readonly x: number;
  readonly y: number;
  readonly kind: ImpactKind;
  readonly hitSide: Side | null;
  readonly canopy: Canopy | null;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

/** t in [0,1] where segment p0->p1 first enters the circle, or null. sqrt only. */
function segmentCircle(x0: number, y0: number, x1: number, y1: number, c: Circle): number | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const fx = x0 - c.x;
  const fy = y0 - c.y;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - c.r * c.r;
  if (cc <= 0) return 0;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t = (-b - s) / (2 * a);
  if (t >= 0 && t <= 1) return t;
  return null;
}

/**
 * Semi-implicit Euler at a fixed step, swept terrain collision with an 8-iteration bisection,
 * bean and canopy circles tested on the same segment (ARCHITECTURE §3.2, §3.5).
 */
export function fly(stage: Stage, p: Projectile, shooter: Side): Flight {
  const buf = new Float64Array((MAX_STEPS + 1) * 2);
  let x = p.x0;
  let y = p.y0;
  let vx = p.vx0;
  let vy = p.vy0;
  buf[0] = x;
  buf[1] = y;
  const target: Side = shooter === 0 ? 1 : 0;
  const beans: readonly Circle[] = [
    { x: stage.beanX[0], y: stage.beanY[0] + BEAN_RADIUS, r: BEAN_RADIUS },
    { x: stage.beanX[1], y: stage.beanY[1] + BEAN_RADIUS, r: BEAN_RADIUS },
  ];
  const targetBean = beans[target];
  if (targetBean === undefined) throw new Error('bean miss');

  for (let step = 1; step <= MAX_STEPS; step++) {
    vx += p.ax * DT;
    vy += GRAVITY * DT;
    const nx = x + vx * DT;
    const ny = y + vy * DT;

    // direct hit on the opponent (own bean is never hit: the shot leaves from above it)
    const tb = segmentCircle(x, y, nx, ny, targetBean);
    // canopies (both sides: your own canopy can eat a bad lob)
    let tc: number | null = null;
    let hitCanopy: Canopy | null = null;
    for (const c of stage.canopies) {
      const t = segmentCircle(x, y, nx, ny, c);
      if (t !== null && (tc === null || t < tc)) {
        tc = t;
        hitCanopy = c;
      }
    }
    // terrain crossing
    let tt: number | null = null;
    if (nx >= 0 && nx <= STAGE_WIDTH && ny <= heightAt(stage, nx)) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const mx = x + (nx - x) * mid;
        const my = y + (ny - y) * mid;
        if (my <= heightAt(stage, mx)) hi = mid;
        else lo = mid;
      }
      tt = hi;
    }

    let best: number | null = null;
    let kind: ImpactKind | null = null;
    if (tb !== null) {
      best = tb;
      kind = 'direct';
    }
    if (tc !== null && (best === null || tc < best)) {
      best = tc;
      kind = 'leaf';
    }
    if (tt !== null && (best === null || tt < best)) {
      best = tt;
      kind = 'dust';
    }

    if (best !== null && kind !== null) {
      const ix = x + (nx - x) * best;
      const iy = y + (ny - y) * best;
      buf[step * 2] = ix;
      buf[step * 2 + 1] = iy;
      return {
        trajectory: buf.subarray(0, (step + 1) * 2),
        steps: step,
        x: ix,
        y: iy,
        kind,
        hitSide: kind === 'direct' ? target : null,
        canopy: kind === 'leaf' ? hitCanopy : null,
      };
    }

    x = nx;
    y = ny;
    buf[step * 2] = x;
    buf[step * 2 + 1] = y;

    if (x < -2 || x > STAGE_WIDTH + 2 || y < -5) {
      return {
        trajectory: buf.subarray(0, (step + 1) * 2),
        steps: step,
        x,
        y,
        kind: 'offstage',
        hitSide: null,
        canopy: null,
      };
    }
  }
  return {
    trajectory: buf,
    steps: MAX_STEPS,
    x,
    y,
    kind: 'offstage',
    hitSide: null,
    canopy: null,
  };
}
