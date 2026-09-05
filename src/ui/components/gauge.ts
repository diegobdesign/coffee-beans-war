const NS = 'http://www.w3.org/2000/svg';

export interface Gauge {
  readonly el: SVGSVGElement;
  setPower(perMille: number): void;
  setBracket(lo: number | null, hi: number | null): void;
}

/** 96px pressure-gauge arc, last 15% in danger with 45° hatching (UX.md §3.2, §7.4). Bracket band per §4.5d. */
export function createGauge(): Gauge {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 96 56');
  svg.setAttribute('width', '96');
  svg.setAttribute('height', '56');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('gauge');
  // semicircle from (8,48) to (88,48), radius 40, centre (48,48)
  svg.innerHTML =
    '<defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="4" class="gauge-hatch"/></pattern></defs>' +
    '<path class="gauge-track" d="M8 48 A40 40 0 0 1 88 48"/>' +
    '<path class="gauge-danger" d="M77.6 22.8 A40 40 0 0 1 88 48"/>' +
    '<path class="gauge-danger-hatch" d="M77.6 22.8 A40 40 0 0 1 88 48" stroke="url(#hatch)"/>' +
    '<path class="gauge-bracket" d="" />' +
    '<path class="gauge-fill" d="M8 48 A40 40 0 0 1 8 48"/>';
  const fillEl = svg.querySelector<SVGPathElement>('.gauge-fill');
  const bracketEl = svg.querySelector<SVGPathElement>('.gauge-bracket');
  if (fillEl === null || bracketEl === null) throw new Error('gauge svg');
  const point = (t: number): [number, number] => {
    const a = Math.PI * (1 - t);
    return [48 + 40 * Math.cos(a), 48 - 40 * Math.sin(a)];
  };
  const arc = (from: number, to: number): string => {
    const [x0, y0] = point(from);
    const [x1, y1] = point(to);
    const large = to - from > 0.5 ? 1 : 0;
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A40 40 0 ${String(large)} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  return {
    el: svg,
    setPower(pm) {
      const t = Math.max(0, Math.min(0.999, pm / 1000));
      fillEl.setAttribute('d', t <= 0.001 ? '' : arc(0, t));
    },
    setBracket(lo, hi) {
      if (lo === null || hi === null || hi <= lo) {
        bracketEl.setAttribute('d', '');
        return;
      }
      bracketEl.setAttribute('d', arc(lo / 1000, hi / 1000));
    },
  };
}
