export interface ReceiptData {
  readonly duelNo: number;
  readonly opponent: string;
  readonly origin: string;
  readonly stage: string;
  readonly hits: number;
  readonly shots: number;
  readonly steamMax: number;
  readonly damage: number;
  readonly taken: number;
  readonly won: boolean;
  readonly rpDelta: number;
  readonly bonuses: readonly string[];
  readonly rp: number;
  readonly next: number | null;
}

function line(label: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'receipt-line';
  const l = document.createElement('span');
  l.textContent = label;
  const v = document.createElement('span');
  v.textContent = value;
  row.append(l, v);
  return row;
}

/** The result prints as an itemised receipt (ART-DIRECTION §9, UX.md §6.7). */
export function createReceipt(
  d: ReceiptData,
  onOneMoreGo: (e: Event) => void,
): { el: HTMLElement; primary: HTMLButtonElement } {
  const el = document.createElement('section');
  el.className = 'receipt';
  el.setAttribute('aria-label', d.won ? 'Result: you won.' : 'Result: you lost.');
  const head = document.createElement('div');
  head.className = 'receipt-head';
  head.textContent = `DUEL #${String(d.duelNo).padStart(4, '0')}`;
  el.append(head);
  el.append(line('VS', `${d.opponent.toUpperCase()} · ${d.origin}`));
  el.append(line('STAGE', d.stage));
  const tear1 = document.createElement('div');
  tear1.className = 'receipt-tear';
  el.append(tear1);
  el.append(line('HITS', String(d.hits)));
  el.append(line('SHOTS', String(d.shots)));
  el.append(line('STEAM MAX', String(d.steamMax)));
  el.append(line('DAMAGE', String(d.damage)));
  el.append(line('TAKEN', String(d.taken)));
  const tear2 = document.createElement('div');
  tear2.className = 'receipt-tear';
  el.append(tear2);
  const result = document.createElement('div');
  result.className = 'receipt-result';
  const rp = document.createElement('div');
  rp.className = 'receipt-rp';
  rp.textContent = `${d.rpDelta >= 0 ? '+' : '−'}${String(Math.abs(d.rpDelta))} RP`;
  const stamp = document.createElement('div');
  stamp.className = `stamp ${d.won ? 'stamp--win' : 'stamp--lose'}`;
  stamp.textContent = d.won ? 'ROASTED' : 'DECAF';
  result.append(rp, stamp);
  el.append(result);
  for (const b of d.bonuses) el.append(line(b, ''));
  const total = d.next ?? d.rp;
  const filled = d.next === null ? 10 : Math.max(0, Math.min(10, Math.round((d.rp / total) * 10)));
  el.append(
    line(
      'ROAST',
      `[${'|'.repeat(filled)}${'.'.repeat(10 - filled)}] ${String(d.rp)}${d.next === null ? '' : ` / ${String(d.next)}`}`,
    ),
  );
  const primary = document.createElement('button');
  primary.type = 'button';
  primary.className = 'btn btn--primary btn--wide';
  primary.textContent = 'ONE MORE GO';
  primary.addEventListener('click', onOneMoreGo);
  el.append(primary);
  return { el, primary };
}
