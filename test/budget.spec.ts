import { describe, expect, it } from 'vitest';
import { drawableCount, triangleCount } from '../src/render/merge';
import { buildDuelGraph } from '../src/render/duel/graph';
import type { DuelSetup, Stance } from '../src/sim/types';

const STANCES: Stance[] = ['mountain', 'tree', 'flood'];

/**
 * Gate A (ARCHITECTURE §2.8): the static duel graph must fit ART-DIRECTION §13 before a shot is fired.
 * Dynamic layers (dot pools, fog, ≤6 projectiles) add at most 6 draws; budget them here as headroom.
 */
describe('duel scene budget', () => {
  it('every stance pair fits: ≤ 60k triangles, ≤ 24 static draws (30 minus dynamic headroom)', () => {
    for (const a of STANCES) {
      for (const b of STANCES) {
        const setup: DuelSetup = {
          duelSeed: 1,
          suddenDeathFrom: null,
          sides: [
            { beanClass: 'liberica', machine: 'press', stance: a },
            { beanClass: 'robusta', machine: 'espresso', stance: b },
          ],
        };
        const g = buildDuelGraph(setup, [0x8c5a2b, 0x4a2a18], [0xe8b86d, 0x7fa7c4]).group;
        const tris = triangleCount(g);
        const draws = drawableCount(g);
        expect(tris, `${a} vs ${b} triangles`).toBeLessThanOrEqual(60_000);
        expect(draws, `${a} vs ${b} draws`).toBeLessThanOrEqual(24);
      }
    }
  });
});
