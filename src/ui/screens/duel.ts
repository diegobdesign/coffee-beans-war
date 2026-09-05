import { chip } from '../components/chip';
import { createCup, type Cup } from '../components/cup';
import { createGauge, type Gauge } from '../components/gauge';
import type { Ammo } from '../../sim/types';

export interface DuelHudHandlers {
  onKeyboardAim(angleDd: number, powerPm: number): void;
  onFire(angleDd: number, powerPm: number, e: Event): void;
  onAmmo(ammo: Ammo): void;
  onOneMoreGo(e: Event): void;
}

export interface DuelHud {
  readonly root: HTMLElement;
  readonly aimLayer: HTMLElement;
  /** the cup window the Spotter camera renders into (a hole in a paper frame) */
  readonly spotterEl: HTMLElement;
  setTurn(text: string): void;
  setSteam(value: number): void;
  setStances(left: string, right: string): void;
  setAim(angleDd: number | null, powerPm: number | null, frozen: boolean): void;
  setCups(you: number, them: number): void;
  setRack(rack: { dark: number; ground: number; cup: number }, selected: Ammo): void;
  setMachine(name: string): void;
  setCall(text: string | null): void;
  setResult(text: string | null): void;
  setBracket(lo: number | null, hi: number | null): void;
  readAim(): { angleDd: number; powerPm: number };
  dispose(): void;
}

function steamText(v: number): string {
  if (v === 0) return 'STEAM 0 ·';
  return `STEAM ${String(Math.abs(v))} ${v > 0 ? '→' : '←'}`;
}

const AMMO_LABEL: Record<Ammo, string> = {
  green: 'GREEN BEAN',
  dark: 'DARK ROAST',
  ground: 'GROUND',
  cup: 'FULL CUP',
};

/**
 * The duel HUD. The aim UI is real DOM (two ranges + Fire) so keyboard and AT work by construction
 * (UX.md §3.6.1, ARCHITECTURE.md §11.1). The drag writes into it once per frame.
 */
export function createDuelHud(app: HTMLElement, h: DuelHudHandlers): DuelHud {
  const root = document.createElement('main');
  root.className = 'hud';
  root.setAttribute('aria-labelledby', 'duel-title');
  const title = document.createElement('h1');
  title.id = 'duel-title';
  title.className = 'sr-only';
  title.textContent = 'Duel';

  const aimLayer = document.createElement('div');
  aimLayer.className = 'aim-layer';
  aimLayer.setAttribute('aria-hidden', 'true');

  const turn = chip('YOUR SHOT.', 'chip--tl');
  turn.id = 'turn';
  turn.setAttribute('aria-live', 'polite');
  const steam = chip(steamText(0), 'chip--tc');
  const call = chip('', 'chip--inline', 'chip--hidden', 'chip--call');
  call.id = 'call';
  call.setAttribute('aria-live', 'polite');
  const result = chip('', 'chip--center', 'chip--hidden', 'chip--big');
  result.id = 'shotresult';
  result.setAttribute('aria-live', 'polite');

  // the Spotter stack: window, opponent cup under it, call chip under that (UX.md §4.1)
  const spotterStack = document.createElement('div');
  spotterStack.className = 'spotter-stack';
  const spotterEl = document.createElement('div');
  spotterEl.className = 'spotter';
  spotterEl.setAttribute('role', 'img');
  spotterEl.setAttribute(
    'aria-label',
    'The Spotter: a close view of your opponent. You cannot see how far away they are.',
  );
  const spotterRim = document.createElement('div');
  spotterRim.className = 'spotter-rim';
  spotterEl.append(spotterRim);
  const spotterRing = document.createElement('div');
  spotterRing.className = 'spotter-ring';
  spotterRing.setAttribute('aria-hidden', 'true');
  const cupYou: Cup = createCup('Your cup');
  const cupThem: Cup = createCup('Their cup');
  const cups = document.createElement('div');
  cups.className = 'cups';
  const cupL = document.createElement('div');
  cupL.className = 'cup-slot cup-slot--l';
  cupL.append(cupYou.el);
  spotterStack.append(spotterEl, cupThem.el, call);
  cups.append(cupL);

  // HUD block
  const block = document.createElement('div');
  block.className = 'hud-block';
  const stances = chip('', 'chip--inline', 'chip--dim');
  const angleChip = document.createElement('label');
  angleChip.className = 'chip chip--inline chip--range';
  const angleIn = document.createElement('input');
  angleIn.type = 'range';
  angleIn.min = '-15';
  angleIn.max = '90';
  angleIn.step = '1';
  angleIn.value = '45';
  angleIn.setAttribute('aria-label', 'Angle in degrees');
  const angleOut = document.createElement('output');
  angleOut.textContent = '45°';
  angleChip.append(angleIn, angleOut);
  const powerChip = document.createElement('label');
  powerChip.className = 'chip chip--inline chip--range';
  const powerIn = document.createElement('input');
  powerIn.type = 'range';
  powerIn.min = '0';
  powerIn.max = '100';
  powerIn.step = '1';
  powerIn.value = '60';
  powerIn.setAttribute('aria-label', 'Power in percent');
  const powerOut = document.createElement('output');
  powerOut.textContent = '60%';
  powerChip.append(powerIn, powerOut);
  const gauge: Gauge = createGauge();
  const fire = document.createElement('button');
  fire.className = 'btn btn--primary';
  fire.textContent = 'FIRE';
  fire.type = 'button';
  const rack = document.createElement('div');
  rack.className = 'rack';
  const rackBtns = new Map<Ammo, HTMLButtonElement>();
  for (const a of ['green', 'dark', 'ground', 'cup'] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip chip--inline chip--btn';
    b.dataset['ammo'] = a;
    b.addEventListener('click', () => {
      h.onAmmo(a);
    });
    rackBtns.set(a, b);
    rack.append(b);
  }
  const machine = chip('', 'chip--inline', 'chip--dim');
  const row1 = document.createElement('div');
  row1.className = 'hud-row';
  row1.append(angleChip, powerChip, gauge.el, fire);
  const row2 = document.createElement('div');
  row2.className = 'hud-row';
  row2.append(rack, machine, stances);
  block.append(row1, row2);

  const oneMore = document.createElement('button');
  oneMore.className = 'btn btn--primary chip--hidden one-more';
  oneMore.type = 'button';
  oneMore.textContent = 'ONE MORE GO';
  oneMore.addEventListener('click', (e) => {
    h.onOneMoreGo(e);
  });

  const readAim = (): { angleDd: number; powerPm: number } => ({
    angleDd: Math.round(angleIn.valueAsNumber * 10),
    powerPm: Math.round(powerIn.valueAsNumber * 10),
  });
  const onInput = (): void => {
    const a = readAim();
    angleOut.textContent = `${String(angleIn.valueAsNumber)}°`;
    powerOut.textContent = `${String(powerIn.valueAsNumber)}%`;
    gauge.setPower(a.powerPm);
    h.onKeyboardAim(a.angleDd, a.powerPm);
  };
  angleIn.addEventListener('input', onInput);
  powerIn.addEventListener('input', onInput);
  fire.addEventListener('click', (e) => {
    const a = readAim();
    h.onFire(a.angleDd, a.powerPm, e);
  });

  root.append(
    title,
    aimLayer,
    turn,
    steam,
    result,
    cups,
    spotterStack,
    spotterRing,
    block,
    oneMore,
  );
  app.append(root);

  return {
    root,
    aimLayer,
    spotterEl,
    setTurn(text) {
      turn.textContent = text;
    },
    setSteam(v) {
      steam.textContent = steamText(v);
    },
    setStances(l, r) {
      stances.textContent = `${l} vs ${r}`;
    },
    setAim(angleDd, powerPm, frozen) {
      if (angleDd !== null) {
        const deg = angleDd / 10;
        if (angleIn.valueAsNumber !== deg) angleIn.value = String(deg);
        angleOut.textContent = `${String(Math.round(deg))}°`;
      }
      if (powerPm !== null) {
        const pct = powerPm / 10;
        if (powerIn.valueAsNumber !== pct) powerIn.value = String(pct);
        powerOut.textContent = `${String(Math.round(pct))}%`;
        gauge.setPower(powerPm);
      }
      angleChip.classList.toggle('chip--dim', frozen);
      powerChip.classList.toggle('chip--dim', frozen);
    },
    setCups(you, them) {
      cupYou.setFill(you);
      cupThem.setFill(them);
    },
    setRack(r, selected) {
      for (const [a, b] of rackBtns) {
        const count =
          a === 'green'
            ? '∞'
            : a === 'dark'
              ? `×${String(r.dark)}`
              : a === 'ground'
                ? `×${String(r.ground)}`
                : `×${String(r.cup)}`;
        b.textContent = `${AMMO_LABEL[a]} ${count}`;
        b.classList.toggle('chip--active', a === selected);
        b.disabled = a !== 'green' && count === '×0';
        b.setAttribute('aria-pressed', a === selected ? 'true' : 'false');
      }
    },
    setMachine(name) {
      machine.textContent = name;
    },
    setCall(text) {
      call.classList.toggle('chip--hidden', text === null);
      call.textContent = text ?? '';
    },
    setResult(text) {
      result.classList.toggle('chip--hidden', text === null);
      result.textContent = text ?? '';
      oneMore.classList.toggle('chip--hidden', text === null);
      block.classList.toggle('chip--hidden', text !== null);
      if (text !== null) oneMore.focus();
    },
    setBracket(lo, hi) {
      gauge.setBracket(lo, hi);
    },
    readAim,
    dispose() {
      root.remove();
    },
  };
}
