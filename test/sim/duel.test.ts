import { describe, expect, it } from 'vitest';
import { applyShot, initialState, replayDuel, simulateShot, steamAt } from '../../src/sim/duel';
import { buildStage, heightAt } from '../../src/sim/terrain';
import { CLASS, STAGE_WIDTH, STANCE } from '../../src/sim/rules';
import type { BeanClass, DuelSetup, Machine, Stance, TurnInput } from '../../src/sim/types';

const STANCES: Stance[] = ['mountain', 'tree', 'flood'];
const CLASSES: BeanClass[] = ['arabica', 'robusta', 'liberica'];
const MACHINES: Machine[] = ['moka', 'press', 'espresso', 'aeropress'];

function setup(s0: Stance, s1: Stance, seed = 0xbeef): DuelSetup {
  return {
    duelSeed: seed,
    suddenDeathFrom: null,
    sides: [
      { beanClass: 'arabica', machine: 'moka', stance: s0 },
      { beanClass: 'robusta', machine: 'press', stance: s1 },
    ],
  };
}

const shot = (
  turnIndex: number,
  angle = 450,
  power = 700,
  ammo: TurnInput['ammo'] = 'green',
): TurnInput => ({
  turnIndex,
  angleDeciDeg: angle,
  powerPerMille: power,
  ammo,
  doubleShot: false,
});

describe('stage', () => {
  it('puts each bean on its stance height with a flat platform', () => {
    for (const a of STANCES) {
      for (const b of STANCES) {
        const st = buildStage(setup(a, b));
        expect(heightAt(st, 4)).toBeCloseTo(STANCE[a].height, 9);
        expect(heightAt(st, 24)).toBeCloseTo(STANCE[b].height, 9);
        expect(heightAt(st, 3)).toBeCloseTo(STANCE[a].height, 9);
        expect(st.heights.length).toBe(113);
        for (const h of st.heights) expect(h).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('has a rock lip only in front of mountain beans', () => {
    const st = buildStage(setup('mountain', 'flood'));
    expect(heightAt(st, 5.25)).toBeCloseTo(3.5, 9);
    expect(heightAt(st, 22.75)).toBeCloseTo(0, 9);
  });
  it('clamps off-stage samples', () => {
    const st = buildStage(setup('flood', 'flood'));
    expect(heightAt(st, -5)).toBe(heightAt(st, 0));
    expect(heightAt(st, STAGE_WIDTH + 5)).toBe(heightAt(st, STAGE_WIDTH));
  });
});

describe('steam', () => {
  it('is an order-independent function of the turn index', () => {
    const s = setup('tree', 'tree', 7);
    const a = [0, 1, 2, 3, 4, 5].map((t) => steamAt(s, t));
    const b = [5, 3, 1, 4, 0, 2].map((t) => steamAt(s, t));
    expect(b).toEqual([a[5], a[3], a[1], a[4], a[0], a[2]]);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(-10);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
  it('doubles in sudden death', () => {
    const s = setup('tree', 'tree', 7);
    const frozen: DuelSetup = { ...s, suddenDeathFrom: 3 };
    expect(steamAt(frozen, 3)).toBe(steamAt(s, 3) * 2);
  });
});

describe('simulateShot', () => {
  it('a flat strong shot from the ridge lands somewhere and produces a call', () => {
    const s = setup('mountain', 'flood');
    const st = initialState(s);
    const r = simulateShot(s, st, shot(0, 300, 900));
    expect(r.impacts).toHaveLength(1);
    expect(['close', 'short', 'long']).toContain(r.call);
    expect(Number.isInteger(r.damage)).toBe(true);
    expect(r.trajectories[0]?.length).toBeGreaterThan(4);
  });
  it('ground coffee fires six pellets and six impacts', () => {
    const s = setup('flood', 'flood');
    const r = simulateShot(s, initialState(s), shot(0, 450, 800, 'ground'));
    expect(r.impacts).toHaveLength(6);
    expect(r.trajectories).toHaveLength(6);
  });
  it('rejects firing ammo that is out', () => {
    const s = setup('flood', 'flood');
    let st = initialState(s);
    st = applyShot(s, st, shot(0, 450, 500, 'cup'), simulateShot(s, st, shot(0, 450, 500, 'cup')));
    st = applyShot(s, st, shot(1), simulateShot(s, st, shot(1)));
    expect(() => simulateShot(s, st, shot(2, 450, 500, 'cup'))).toThrow(/out of ammo/);
  });
  it('a direct hit is possible: search a flood-vs-flood duel for one', () => {
    const s = setup('flood', 'flood', 1);
    const st = initialState(s);
    let hit = false;
    for (let a = 200; a <= 700 && !hit; a += 10) {
      for (let p = 400; p <= 1000 && !hit; p += 25) {
        const r = simulateShot(s, st, shot(0, a, p));
        if (r.hitSide === 1) {
          hit = true;
          expect(r.call).toBe('close');
          expect(r.damage).toBeGreaterThan(0);
        }
      }
    }
    expect(hit).toBe(true);
  });
  it('is bit-identical across repeated calls and independent of impacts history', () => {
    const s = setup('tree', 'mountain', 99);
    const st = initialState(s);
    const a = simulateShot(s, st, shot(0, 550, 850, 'dark'));
    const b = simulateShot(s, st, shot(0, 550, 850, 'dark'));
    expect(a.hash).toBe(b.hash);
    expect(Array.from(a.trajectories[0] ?? [])).toEqual(Array.from(b.trajectories[0] ?? []));
  });
});

describe('replayDuel', () => {
  it('replays to the same state as incremental application', () => {
    const s = setup('mountain', 'tree', 2026);
    const turns: TurnInput[] = [];
    let st = initialState(s);
    for (let i = 0; i < 12 && st.outcome === 'active'; i++) {
      const t = shot(i, 300 + (i % 5) * 60, 600 + (i % 4) * 100, i % 4 === 3 ? 'dark' : 'green');
      turns.push(t);
      st = applyShot(s, st, t, simulateShot(s, st, t));
    }
    const replayed = replayDuel(s, turns);
    expect(replayed).toEqual(st);
    expect(replayed.impacts.length).toBe(turns.length);
    for (const h of replayed.hp) expect(Number.isInteger(h)).toBe(true);
  });
  it('starts with class cup sizes and alternates sides', () => {
    for (const c of CLASSES) {
      const s: DuelSetup = {
        ...setup('flood', 'flood'),
        sides: [
          { beanClass: c, machine: 'moka', stance: 'flood' },
          { beanClass: c, machine: 'moka', stance: 'flood' },
        ],
      };
      const st = initialState(s);
      expect(st.hp).toEqual([CLASS[c].cup, CLASS[c].cup]);
      const n = applyShot(s, st, shot(0), simulateShot(s, st, shot(0)));
      expect(n.toMove).toBe(1);
      expect(n.turnIndex).toBe(1);
    }
  });
  it('sudden death drains both cups after 16 turns and ends the duel', () => {
    const s = setup('mountain', 'mountain', 5);
    const turns: TurnInput[] = [];
    for (let i = 0; i < 64; i++) turns.push(shot(i, 890, 100));
    const st = replayDuel(s, turns);
    expect(st.outcome).not.toBe('active');
  });
  it('every machine and stance pair simulates without throwing', () => {
    for (const m of MACHINES) {
      for (const a of STANCES) {
        for (const b of STANCES) {
          const s: DuelSetup = {
            duelSeed: 11,
            suddenDeathFrom: null,
            sides: [
              { beanClass: 'liberica', machine: m, stance: a },
              { beanClass: 'arabica', machine: 'aeropress', stance: b },
            ],
          };
          const st = replayDuel(s, [
            shot(0, 400, 1000, 'cup'),
            shot(1, 600, 900, 'ground'),
            shot(2, 100, 1000),
          ]);
          expect(st.turnIndex).toBeGreaterThan(0);
        }
      }
    }
  });
});
