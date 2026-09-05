import type { WebGLRenderer } from 'three';

/**
 * DPR ladder with hysteresis (ARCHITECTURE §2.7). Drops a rung after 60 bad frames, heals after
 * 300 good ones, at most twice, so a single GC pause does not permanently downgrade a phone.
 * `?perf=low` locks the bottom rung, `?perf=high` locks the top.
 */
const DROP_MS = 20;
const DROP_FRAMES = 60;
const HEAL_MS = 14;
const HEAL_FRAMES = 300;
const MAX_HEALS = 2;

export interface PerfGovernor {
  readonly level: number;
  readonly rungs: readonly number[];
  frame(ms: number): void;
  reset(): void;
}

export function createPerfGovernor(
  renderer: WebGLRenderer,
  isMobile: boolean,
  mode: 'auto' | 'low' | 'high',
): PerfGovernor {
  const dpr = window.devicePixelRatio;
  const rungs = (isMobile ? [1.5, 1.25, 1.0] : [2.0, 1.5, 1.0]).map((r) => Math.min(dpr, r));
  let level = mode === 'low' ? rungs.length - 1 : 0;
  let bad = 0;
  let good = 0;
  let heals = 0;
  const apply = (): void => {
    renderer.setPixelRatio(rungs[level] ?? 1);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  apply();
  return {
    get level() {
      return level;
    },
    rungs,
    frame(ms) {
      if (mode !== 'auto') return;
      if (ms > DROP_MS) {
        bad += 1;
        good = 0;
        if (bad >= DROP_FRAMES && level < rungs.length - 1) {
          level += 1;
          bad = 0;
          apply();
        }
      } else if (ms < HEAL_MS) {
        good += 1;
        bad = 0;
        if (good >= HEAL_FRAMES && level > 0 && heals < MAX_HEALS) {
          level -= 1;
          heals += 1;
          good = 0;
          apply();
        }
      } else {
        bad = 0;
        good = 0;
      }
    },
    reset() {
      bad = 0;
      good = 0;
    },
  };
}
