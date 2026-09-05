const NS = 'http://www.w3.org/2000/svg';

export interface Cup {
  readonly el: SVGSVGElement;
  /** 0..1, drains top-down over 400ms via CSS transition on the clip */
  setFill(fraction: number): void;
  setAccent(hex: string): void;
}

/** ART-DIRECTION §9: HP is a 40×48 takeaway cup. No numbers. Rim goes danger at ≤25% with a dashed rim and a tilt (UX.md §7.4). */
export function createCup(label: string): Cup {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 48');
  svg.setAttribute('width', '40');
  svg.setAttribute('height', '48');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.classList.add('cup');
  svg.innerHTML =
    '<defs><clipPath id="' +
    label.replace(/\W/g, '') +
    'clip"><path d="M6 10 L34 10 L30 44 L10 44 Z"/></clipPath></defs>' +
    '<path class="cup-body" d="M6 10 L34 10 L30 44 L10 44 Z"/>' +
    '<rect class="cup-fill" x="0" y="10" width="40" height="34" clip-path="url(#' +
    label.replace(/\W/g, '') +
    'clip)"/>' +
    '<rect class="cup-crema" x="0" y="10" width="40" height="3" clip-path="url(#' +
    label.replace(/\W/g, '') +
    'clip)"/>' +
    '<path class="cup-rim" d="M4 6 H36 V10 H4 Z"/>';
  const fill = svg.querySelector<SVGRectElement>('.cup-fill');
  const crema = svg.querySelector<SVGRectElement>('.cup-crema');
  const rim = svg.querySelector<SVGPathElement>('.cup-rim');
  if (fill === null || crema === null || rim === null) throw new Error('cup svg');
  return {
    el: svg,
    setFill(fraction) {
      const f = Math.max(0, Math.min(1, fraction));
      const top = 10 + 34 * (1 - f);
      fill.setAttribute('y', String(top));
      fill.setAttribute('height', String(44 - top));
      crema.setAttribute('y', String(top));
      svg.classList.toggle('cup--danger', f <= 0.25);
    },
    setAccent(hex) {
      rim.style.fill = hex;
    },
  };
}
