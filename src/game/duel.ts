import { naiveBotShot } from '../bots/naive';
import type { Frame } from '../core/clock';
import { createDuelView, sideLabel, type DuelView } from '../render/duel/view';
import { applyShot, initialState, previewTrajectory, simulateShot } from '../sim/duel';
import { CLASS } from '../sim/rules';
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
  frame(f: Frame): void;
  dispose(): void;
}

export interface DuelControllerOptions {
  readonly opponentName: string;
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

  const view: DuelView = createDuelView(canvas, setup, { roast: opts.roast, accent: opts.accent });
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
    phase = 'playing';
    hud.setAim(a.angleDd, a.powerPm, true);
    hud.setCall(null);
    view.shots.setPreview(null);
    view.squash(YOU);
    view.setAim(YOU, null);
    playback = view.shots.play(result, input.ammo, (impact) => {
      view.shots.addMarker(impact);
    });
    const finish = (): void => {
      if (result.hitSide !== null) {
        view.hitStop(60);
        view.shake();
        view.hitReact(result.hitSide);
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
    const input = naiveBotShot(setup, state);
    const result = simulateShot(setup, state, input);
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
      const won = state.outcome === 'side0';
      hud.setTurn(won ? 'Roasted.' : 'Decaf.');
      hud.setResult(won ? 'Ground.' : 'Decaf.');
      gate.lockFor(250);
      gate.mounted();
      return;
    }
    if (state.toMove === YOU) {
      phase = 'aim';
      hud.setTurn(`YOUR SHOT.  ·  VS ${opts.opponentName}`);
      const cur = hud.readAim();
      showAim(cur);
    } else {
      phase = 'bot';
      hud.setTurn(`THEIR SHOT.  ·  ${opts.opponentName}`);
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

  hud.setMachine(MACHINE_NAME[setup.sides[YOU].machine]);
  hud.setStances(sideLabel(setup, YOU), sideLabel(setup, 1));
  hud.setTurn(`YOUR SHOT.  ·  VS ${opts.opponentName}`);
  syncHud();
  showAim(hud.readAim());

  return {
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
