import {
  AIM_DEAD_ZONE_PX,
  HUD_STRIP_LANDSCAPE_PX,
  LANDSCAPE_DEAD_ZONE_PX,
  ORIGIN_BAND_LANDSCAPE_TOP_PX,
  ORIGIN_BAND_PORTRAIT,
} from './constants';

/** CSS px on the visual viewport. Computed once per layout (UX.md §13.5). */
export function dragRadius(vw: number, vh: number): number {
  return 0.4 * Math.min(vw, vh);
}

/** dist and R in CSS px. 0..1000. Pure. Linear, because the bracket band is a bisection. */
export function powerPerMilleFromDrag(dist: number, R: number): number {
  const t = dist / R;
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.round(c * 1000);
}

/** dx, dy in CSS px (dy positive downward). -150..900 deci-degrees. Pure. */
export function angleDeciDegFromDrag(dx: number, dy: number): number {
  const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  const c = deg < -15 ? -15 : deg > 90 ? 90 : deg;
  return Math.round(c * 10) || 0;
}

export interface Band {
  readonly top: number;
  readonly bottom: number;
}

/** Where a drag may begin, in viewport px (UX.md §3.7.2, §3.8). */
export function originBand(vw: number, vh: number): Band {
  if (vh >= vw) {
    return { top: vh * ORIGIN_BAND_PORTRAIT[0], bottom: vh * ORIGIN_BAND_PORTRAIT[1] };
  }
  return {
    top: ORIGIN_BAND_LANDSCAPE_TOP_PX,
    bottom: vh - HUD_STRIP_LANDSCAPE_PX - LANDSCAPE_DEAD_ZONE_PX,
  };
}

export function inDeadZone(y: number, vh: number): boolean {
  return y >= vh - AIM_DEAD_ZONE_PX;
}
