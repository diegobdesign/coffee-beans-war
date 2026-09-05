import { chip } from '../components/chip';

export interface DuelHud {
  readonly root: HTMLElement;
  setTurn(text: string): void;
  setSteam(value: number): void;
  setStances(left: string, right: string): void;
  dispose(): void;
}

function steamText(v: number): string {
  if (v === 0) return 'STEAM 0 ·';
  const arrow = v > 0 ? '→' : '←';
  return `STEAM ${String(Math.abs(v))} ${arrow}`;
}

/** Slice 3: the strip only. Aim, gauge, cups, rack and the Spotter arrive in slices 4 and 5. */
export function createDuelHud(app: HTMLElement): DuelHud {
  const root = document.createElement('div');
  root.className = 'hud';
  const turn = chip('YOUR SHOT.', 'chip--tl');
  const steam = chip(steamText(0), 'chip--tc');
  const stances = chip('', 'chip--bc', 'chip--dim');
  root.append(turn, steam, stances);
  app.append(root);
  return {
    root,
    setTurn(text) {
      turn.textContent = text;
    },
    setSteam(v) {
      steam.textContent = steamText(v);
    },
    setStances(l, r) {
      stances.textContent = `${l}  ·  vs  ·  ${r}`;
    },
    dispose() {
      root.remove();
    },
  };
}
