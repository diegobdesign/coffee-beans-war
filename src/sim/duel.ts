import { fly, type Flight } from './ballistics';
import { hashInts, q4 } from './hash';
import { gaussian, turnRng, type Rng } from './rng';
import {
  AMMO,
  CLASS,
  CLOSE_RADIUS,
  CLOSE_RADIUS_ARABICA,
  DOUBLE_SHOT_DAMAGE_MULT,
  FOG_RADIUS,
  FOG_RADIUS_CUP,
  K_STEAM,
  MACHINE,
  MAX_TURNS,
  MISFIRE_POWER_PER_MILLE,
  RACK,
  STANCE,
  SUDDEN_DEATH_DRAIN,
  SUDDEN_DEATH_ROUNDS,
  V_MAX,
  WILD_SHOT_DAMAGE_MULT,
} from './rules';
import { buildStage, type Stage } from './terrain';
import { cosDeciDeg, sinDeciDeg } from './trig';
import type {
  AmmoRack,
  Call,
  DuelSetup,
  DuelState,
  Impact,
  ImpactKind,
  ShotResult,
  Side,
  TurnInput,
} from './types';

const STEAM_SALT = 0x5734;

/** Steam for a turn as an order-independent fold (ARCHITECTURE §3.3). */
export function steamAt(setup: DuelSetup, turnIndex: number): number {
  let v = 0;
  for (let t = 0; t <= turnIndex; t++) {
    const r = turnRng(setup.duelSeed ^ STEAM_SALT, t);
    v += r.int(7) - 3;
    v = Math.min(10, Math.max(-10, v));
  }
  return inSuddenDeath(setup, turnIndex) ? v * 2 : v;
}

export function inSuddenDeath(setup: DuelSetup, turnIndex: number): boolean {
  if (setup.suddenDeathFrom !== null && turnIndex >= setup.suddenDeathFrom) return true;
  return turnIndex >= SUDDEN_DEATH_ROUNDS * 2;
}

export function initialState(setup: DuelSetup): DuelState {
  const rack = (): AmmoRack => ({ dark: RACK.dark, ground: RACK.ground, cup: RACK.cup });
  return {
    turnIndex: 0,
    toMove: 0,
    hp: [CLASS[setup.sides[0].beanClass].cup, CLASS[setup.sides[1].beanClass].cup],
    ammoLeft: [rack(), rack()],
    steam: steamAt(setup, 0),
    impacts: [],
    outcome: 'active',
  };
}

function hasAmmo(rack: AmmoRack, ammo: TurnInput['ammo']): boolean {
  switch (ammo) {
    case 'green':
      return true;
    case 'dark':
      return rack.dark > 0;
    case 'ground':
      return rack.ground > 0;
    case 'cup':
      return rack.cup > 0;
  }
}

function spend(rack: AmmoRack, ammo: TurnInput['ammo']): AmmoRack {
  switch (ammo) {
    case 'green':
      return rack;
    case 'dark':
      return { ...rack, dark: rack.dark - 1 };
    case 'ground':
      return { ...rack, ground: rack.ground - 1 };
    case 'cup':
      return { ...rack, cup: rack.cup - 1 };
  }
}

function otherSide(s: Side): Side {
  return s === 0 ? 1 : 0;
}

function splashDamage(base: number, radius: number, d: number): number {
  if (radius <= 0 || d >= radius) return 0;
  return base * (1 - (0.5 * d) / radius);
}

export function spotterCall(
  stage: Stage,
  shooter: Side,
  x: number,
  kind: ImpactKind,
  closeRadius: number,
): Call {
  const target = otherSide(shooter);
  const tx = stage.beanX[target];
  if (kind === 'direct') return 'close';
  const dx = x - tx;
  if (Math.abs(dx) <= closeRadius) return 'close';
  // short = fell before reaching them (between shooter and target); long = flew past
  const forward = shooter === 0 ? 1 : -1;
  return dx * forward < 0 ? 'short' : 'long';
}

export function simulateShot(setup: DuelSetup, state: DuelState, input: TurnInput): ShotResult {
  if (state.outcome !== 'active') throw new Error('duel is over');
  if (input.turnIndex !== state.turnIndex) throw new Error('turn index mismatch');
  const shooter = state.toMove;
  const target = otherSide(shooter);
  const me = setup.sides[shooter];
  const them = setup.sides[target];
  const rack = state.ammoLeft[shooter];
  if (!hasAmmo(rack, input.ammo)) throw new Error('out of ammo');

  const stage = buildStage(setup);
  const rng: Rng = turnRng(setup.duelSeed, input.turnIndex);
  const cls = CLASS[me.beanClass];
  const machine = MACHINE[me.machine];
  const ammo = AMMO[input.ammo];

  // class spread, quantised to deci-degrees so the table stays exact
  const spread = cls.spreadDeciDeg > 0 ? Math.round(gaussian(rng) * (cls.spreadDeciDeg / 2)) : 0;
  const wildShot = cls.wildChance > 0 && rng.next() < cls.wildChance;
  const misfire =
    machine.misfireAbovePerMille !== null &&
    input.powerPerMille > machine.misfireAbovePerMille &&
    rng.int(6) === 0;

  const power = misfire ? MISFIRE_POWER_PER_MILLE : input.powerPerMille;
  const speed = (power / 1000) * V_MAX * machine.speed;
  const forward = shooter === 0 ? 1 : -1;
  const ax = ((state.steam * K_STEAM) / ammo.mass) * machine.steamMult;
  const x0 = stage.beanX[shooter] + forward * 0.6;
  const y0 = stage.beanY[shooter] + 1.0;

  const pellets = ammo.pellets;
  const doubleShot = input.doubleShot && me.machine === 'espresso';
  const shots = doubleShot ? 2 : pellets;
  const flights: Flight[] = [];
  for (let i = 0; i < shots; i++) {
    let angle = input.angleDeciDeg + spread;
    if (pellets > 1) {
      // fan evenly across ±spread
      const span = ammo.spreadDeciDeg;
      angle += Math.round(-span + (2 * span * i) / (pellets - 1));
    } else if (doubleShot && i === 1) {
      angle += 15;
    }
    const a = forward === 1 ? angle : 1800 - angle;
    const vx = speed * cosDeciDeg(a);
    const vy = speed * sinDeciDeg(a);
    flights.push(fly(stage, { x0, y0, vx0: vx, vy0: vy, ax }, shooter));
  }

  const tx = stage.beanX[target];
  const ty = stage.beanY[target] + 0.5;
  const radius = ammo.radius * machine.splashMult;
  let damageF = 0;
  let hitSide: Side | null = null;
  const impacts: Impact[] = [];
  for (const f of flights) {
    let d = 0;
    if (f.kind === 'direct') {
      d = ammo.damage;
      hitSide = target;
    } else if (f.kind !== 'offstage') {
      const ddx = f.x - tx;
      const ddy = f.y - ty;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      d = splashDamage(ammo.damage, radius, dist) * STANCE[them.stance].splashTakenMult;
    }
    if (doubleShot) d *= DOUBLE_SHOT_DAMAGE_MULT;
    damageF += d;
    const kind: ImpactKind =
      f.kind === 'dust' && them.stance === 'flood' && Math.abs(f.x - tx) <= 4.5 && f.y <= 0.05
        ? 'splash'
        : f.kind;
    impacts.push({
      turnIndex: input.turnIndex,
      firedBy: shooter,
      x: f.x,
      y: f.y,
      fogRadius: input.ammo === 'cup' ? FOG_RADIUS_CUP : FOG_RADIUS,
      kind,
    });
  }
  damageF *= STANCE[me.stance].damageMult;
  if (wildShot && hitSide !== null) damageF *= WILD_SHOT_DAMAGE_MULT;
  const damage = Math.round(damageF);

  const closeRadius = me.beanClass === 'arabica' ? CLOSE_RADIUS_ARABICA : CLOSE_RADIUS;
  const primary = impacts[0];
  if (primary === undefined) throw new Error('no impact');
  const call = spotterCall(stage, shooter, primary.x, primary.kind, closeRadius);

  const hpTarget = Math.max(0, state.hp[target] - damage);
  const hash = hashInts([
    input.turnIndex,
    q4(primary.x),
    q4(primary.y),
    damage,
    hitSide === null ? -1 : hitSide,
    shooter === 0 ? state.hp[0] : hpTarget,
    shooter === 0 ? hpTarget : state.hp[1],
  ]);

  return {
    trajectories: flights.map((f) => f.trajectory),
    impacts,
    damage,
    hitSide,
    call,
    misfire,
    wildShot,
    hash,
  };
}

export function applyShot(
  setup: DuelSetup,
  state: DuelState,
  input: TurnInput,
  result: ShotResult,
): DuelState {
  const shooter = state.toMove;
  const target = otherSide(shooter);
  const next = input.turnIndex + 1;
  let hp0 = state.hp[0];
  let hp1 = state.hp[1];
  if (target === 0) hp0 = Math.max(0, hp0 - result.damage);
  else hp1 = Math.max(0, hp1 - result.damage);
  if (inSuddenDeath(setup, input.turnIndex)) {
    hp0 = Math.max(0, hp0 - SUDDEN_DEATH_DRAIN);
    hp1 = Math.max(0, hp1 - SUDDEN_DEATH_DRAIN);
  }
  let outcome: DuelState['outcome'] = 'active';
  if (hp0 === 0 && hp1 === 0) outcome = 'draw';
  else if (hp1 === 0) outcome = 'side0';
  else if (hp0 === 0) outcome = 'side1';
  else if (next >= MAX_TURNS) outcome = 'draw';

  const racks: [AmmoRack, AmmoRack] = [state.ammoLeft[0], state.ammoLeft[1]];
  racks[shooter] = spend(racks[shooter], input.ammo);

  return {
    turnIndex: next,
    toMove: target,
    hp: [hp0, hp1],
    ammoLeft: racks,
    steam: steamAt(setup, next),
    impacts: [...state.impacts, ...result.impacts],
    outcome,
  };
}

/** The entire replay contract. Every screen that needs duel state calls this (ARCHITECTURE §3.1). */
export function replayDuel(setup: DuelSetup, turns: readonly TurnInput[]): DuelState {
  let state = initialState(setup);
  for (const t of turns) {
    if (state.outcome !== 'active') break;
    const r = simulateShot(setup, state, t);
    state = applyShot(setup, state, t, r);
  }
  return state;
}

/**
 * The preview arc: the same integrator, the shooter's nominal angle (no class spread, no misfire),
 * one projectile. Presentation only, never stored. Callers take the first 30% of the steps.
 */
export function previewTrajectory(
  setup: DuelSetup,
  state: DuelState,
  input: TurnInput,
): Float64Array {
  const shooter = state.toMove;
  const me = setup.sides[shooter];
  const stage = buildStage(setup);
  const machine = MACHINE[me.machine];
  const ammo = AMMO[input.ammo];
  const speed = (input.powerPerMille / 1000) * V_MAX * machine.speed;
  const forward = shooter === 0 ? 1 : -1;
  const ax = ((state.steam * K_STEAM) / ammo.mass) * machine.steamMult;
  const a = forward === 1 ? input.angleDeciDeg : 1800 - input.angleDeciDeg;
  const f = fly(
    stage,
    {
      x0: stage.beanX[shooter] + forward * 0.6,
      y0: stage.beanY[shooter] + 1.0,
      vx0: speed * cosDeciDeg(a),
      vy0: speed * sinDeciDeg(a),
      ax,
    },
    shooter,
  );
  return f.trajectory;
}
