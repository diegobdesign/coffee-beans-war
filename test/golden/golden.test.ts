import { describe, expect, it } from 'vitest';
import { applyShot, initialState, simulateShot } from '../../src/sim/duel';
import type { DuelSetup, TurnInput } from '../../src/sim/types';
import golden from './vectors.json';

interface Vector {
  setup: DuelSetup;
  turns: TurnInput[];
  hashes: number[];
  final: { hp: [number, number]; outcome: string; impacts: number };
}

const vectors = (golden as unknown as { vectors: Vector[] }).vectors;

describe('golden vectors (bit-exact, zero tolerance)', () => {
  it('has 500 vectors', () => {
    expect(vectors).toHaveLength(500);
  });
  it('every vector replays to its recorded hash chain and final state', () => {
    let failures = 0;
    for (const [vi, v] of vectors.entries()) {
      let state = initialState(v.setup);
      for (const [ti, t] of v.turns.entries()) {
        const r = simulateShot(v.setup, state, t);
        if (r.hash !== v.hashes[ti]) {
          failures++;
          console.error(
            `vector ${String(vi)} turn ${String(ti)}: ${String(r.hash)} !== ${String(v.hashes[ti])}`,
          );
        }
        state = applyShot(v.setup, state, t, r);
      }
      expect([state.hp[0], state.hp[1]]).toEqual(v.final.hp);
      expect(state.outcome).toBe(v.final.outcome);
      expect(state.impacts.length).toBe(v.final.impacts);
    }
    expect(failures).toBe(0);
  });
});
