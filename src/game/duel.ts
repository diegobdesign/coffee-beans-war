import { initialEstimate, updateEstimate, type Estimate } from '../bots/estimate';
import { SIGMA_DEG, type Bot } from '../bots/roster';
import { solveAim } from '../bots/solver';
import { loadProfile, nextThreshold, saveProfile } from '../core/profile';
import type { Frame } from '../core/clock';
import { createDuelView, sideLabel, type DuelView } from '../render/duel/view';
import { applyShot, initialState, previewTrajectory, simulateShot } from '../sim/duel';
import { CLASS, SIDE_X } from '../sim/rules';
import { mulberry32 } from '../sim/rng';
import type { Ammo, Call, DuelSetup, DuelState, Side, TurnInput } from '../sim/types';
import { createAimGesture, type Aim, type AimGesture } from '../ui/input/aim-gesture';
import { createGate } from '../ui/input/gate';
import { createDuelHud, type DuelHud } from '../ui/screens/duel';

const MACHINE_NAME = {
  moka: 'MOKA POT MORTAR',
  press: 'FRENCH PRESS CANNON',
  espresso: 'ESPRESSO MACHINE',
  aeropress: 'AEROPRESS SNIPER',
} as const;
const CALL_TEXT: Record<Call, string> = { close: 'Close.', short: 'Short.', long: 'Long.' };
const YOU: Side = 0;

export interface DuelController {
  readonly renderer: DuelView['renderer'];
  frame(f: Frame): void;
  dispose(): void;
}

export interface DuelControllerOptions {
  readonly bot: Bot;
  readonly duelNo: number;
  /** the scripted first duel: first two of your impacts thin fog at 2.5 units (UX.md §4.5c) */
  readonly firstDuel: boolean;
  readonly roast: readonly [number, number];
  readonly accent: readonly [number, number];
  onOneMoreGo(): void;
}

type Phase = 'aim' | 'playing' | 'bot' | 'over';

/** Orchestrates one duel: gesture → TurnInput → simulateShot → playback → applyShot → opponent → … */
export function createDuel(
  canvas: HTMLCanvasElement,
  app: HTMLElement,
  setup: DuelSetup,
  opts: DuelControllerOptions,
): DuelController {
  let state: DuelState = initialState(setup);
  let phase: Phase = 'aim';
  let ammo: Ammo = 'green';
  let playback: ReturnType<DuelView['shots']['play']> | null = null;
  let botDelay = 0;
  let lastShort: number | null = null;
  let lastLong: number | null = null;
  const gate = createGate();
  const opponentName = opts.bot.name.toUpperCase();
  const biasRng = mulberry32(setup.duelSeed ^ 0x5ea);
  let estimate: Estimate = initialEstimate(SIDE_X[YOU], (biasRng.next() - 0.5) * 5);
  const stats = { shots: 0, hits: 0, steamMax: 0, damage: 0, taken: 0 };

  const view: DuelView = createDuelView(canvas, setup, { roast: opts.roast, accent: opts.accent });
  let yourImpacts = 0;
  const hud: DuelHud = createDuelHud(app, {
    onKeyboardAim(angleDd, powerPm) {
      if (phase !== 'aim') return;
      showAim({ angleDd, powerPm });
    },
    onFire(angleDd, powerPm, e) {
      if (phase !== 'aim' || !gate.accept(e)) return;
      if (powerPm < 80) return;
      fire({ angleDd, powerPm });
    },
    onAmmo(a) {
      if (phase !== 'aim') return;
      ammo = a;
      hud.setRack(state.ammoLeft[YOU], ammo);
      const cur = hud.readAim();
      showAim(cur);
    },
    onOneMoreGo(e) {
      if (!gate.accept(e)) return;
      opts.onOneMoreGo();
    },
  });

  const inputFor = (a: Aim): TurnInput => ({
    turnIndex: state.turnIndex,
    angleDeciDeg: a.angleDd,
    powerPerMille: a.powerPm,
    ammo,
    doubleShot: false,
  });

  const showAim = (a: Aim): void => {
    view.setAim(YOU, a.angleDd);
    hud.setAim(a.angleDd, a.powerPm, false);
    view.shots.setPreview(a.powerPm >= 80 ? previewTrajectory(setup, state, inputFor(a)) : null);
  };

  const syncHud = (): void => {
    const you = state.hp[YOU] / CLASS[setup.sides[YOU].beanClass].cup;
    const them = state.hp[1] / CLASS[setup.sides[1].beanClass].cup;
    hud.setCups(you, them);
    hud.setSteam(state.steam);
    hud.setRack(state.ammoLeft[YOU], ammo);
    hud.setBracket(lastShort, lastLong);
  };

  const fire = (a: Aim): void => {
    const input = inputFor(a);
    const result = simulateShot(setup, state, input);
    stats.shots += 1;
    stats.steamMax = Math.max(stats.steamMax, Math.abs(state.steam));
    if (result.hitSide !== null) stats.hits += 1;
    stats.damage += result.damage;
    phase = 'playing';
    hud.setAim(a.angleDd, a.powerPm, true);
    hud.setCall(null);
    view.shots.setPreview(null);
    view.squash(YOU);
    view.setAim(YOU, null);
    playback = view.shots.play(result, input.ammo, (impact) => {
      view.shots.addMarker(impact);
      const radius = opts.firstDuel && yourImpacts < 2 ? 2.5 : impact.fogRadius;
      yourImpacts += 1;
      view.fog.revealAt(impact.x, impact.y + 0.4, radius);
    });
    const finish = (): void => {
      if (result.hitSide !== null) {
        view.hitStop(60);
        view.shake();
        view.hitReact(result.hitSide);
      } else if (result.call === 'close') {
        view.squash(1); // the flinch in the window
      }
      state = applyShot(setup, state, input, result);
      if (result.call === 'short') lastShort = Math.max(lastShort ?? 0, a.powerPm);
      if (result.call === 'long') lastLong = Math.min(lastLong ?? 1000, a.powerPm);
      if (lastShort !== null && lastLong !== null && lastShort >= lastLong) {
        lastShort = null;
        lastLong = null;
      }
      hud.setCall(CALL_TEXT[result.call]);
      syncHud();
      afterTurn();
    };
    pendingFinish = finish;
  };

  let pendingFinish: (() => void) | null = null;

  const botTurn = (): void => {
    const input = solveAim(setup, state, 1, estimate, SIGMA_DEG[opts.bot.roast]);
    const result = simulateShot(setup, state, input);
    const primary = result.impacts[0];
    if (primary !== undefined) estimate = updateEstimate(estimate, 1, primary.x, result.call);
    stats.taken += result.damage;
    stats.steamMax = Math.max(stats.steamMax, Math.abs(state.steam));
    phase = 'playing';
    view.squash(1);
    playback = view.shots.play(result, input.ammo, (impact) => {
      view.shots.addMarker(impact);
    });
    pendingFinish = (): void => {
      if (result.hitSide !== null) {
        view.hitStop(60);
        view.shake();
        view.hitReact(result.hitSide);
      }
      state = applyShot(setup, state, input, result);
      syncHud();
      afterTurn();
    };
  };

  const afterTurn = (): void => {
    if (state.outcome !== 'active') {
      phase = 'over';
      view.liftFog(600);
      view.setAim(YOU, null);
      const won = state.outcome === 'side0';
      hud.setTurn(won ? 'Roasted.' : 'Decaf.');
      const profile = loadProfile();
      const bonuses: string[] = [];
      let delta = won ? 10 : -5;
      if (won && stats.shots === 1) {
        delta += 10;
        bonuses.push('FIRST SHOT. +10 RP');
      }
      if (won && state.hp[YOU] < 20) {
        delta += 5;
        bonuses.push('COLD BREW COMEBACK. +5 RP');
      }
      profile.rp = Math.max(0, profile.rp + delta);
      profile.duels += 1;
      if (won) {
        profile.wins += 1;
        profile.streak += 1;
        profile.bestStreak = Math.max(profile.bestStreak, profile.streak);
      } else {
        profile.streak = 0;
      }
      saveProfile(profile);
      window.setTimeout(() => {
        hud.showReceipt({
          duelNo: opts.duelNo + 1,
          opponent: opts.bot.name,
          origin: opts.bot.origin,
          stage: `${sideLabel(setup, YOU)} VS ${sideLabel(setup, 1)}`,
          hits: stats.hits,
          shots: stats.shots,
          steamMax: stats.steamMax,
          damage: stats.damage,
          taken: stats.taken,
          won,
          rpDelta: delta,
          bonuses,
          rp: profile.rp,
          next: nextThreshold(profile.rp),
        });
        gate.mounted();
        gate.lockFor(250);
      }, 1400);
      return;
    }
    if (state.toMove === YOU) {
      phase = 'aim';
      hud.setTurn(`YOUR SHOT.  ·  VS ${opponentName}`);
      const cur = hud.readAim();
      showAim(cur);
    } else {
      phase = 'bot';
      hud.setTurn(`THEIR SHOT.  ·  ${opponentName}`);
      botDelay = 1.2 + Math.random() * 0.8; // presentation only, never in the sim
    }
  };

  const gesture: AimGesture = createAimGesture(
    hud.aimLayer,
    {
      onArm() {
        /* pose handled by setAim on the first onAim */
      },
      onAim(a) {
        showAim(a);
      },
      onCancel() {
        view.setAim(YOU, null);
        view.shots.setPreview(null);
        const cur = hud.readAim();
        hud.setAim(cur.angleDd, cur.powerPm, false);
      },
      onFire(a) {
        if (!gate.accept()) return;
        fire(a);
      },
    },
    () => phase === 'aim',
  );

  view.setSpotterElement(hud.spotterEl);
  hud.setMachine(MACHINE_NAME[setup.sides[YOU].machine]);
  hud.setStances(sideLabel(setup, YOU), sideLabel(setup, 1));
  hud.setTurn(`YOUR SHOT.  ·  VS ${opponentName}`);
  syncHud();
  showAim(hud.readAim());

  return {
    renderer: view.renderer,
    frame(f) {
      gesture.flush();
      if (phase === 'playing' && playback !== null) {
        if (playback.update(f.dt)) {
          playback.dispose();
          playback = null;
          const fin = pendingFinish;
          pendingFinish = null;
          fin?.();
        }
      } else if (phase === 'bot') {
        botDelay -= f.dt;
        if (botDelay <= 0) botTurn();
      }
      view.frame(f);
    },
    dispose() {
      gesture.dispose();
      hud.dispose();
      view.dispose();
    },
  };
}
