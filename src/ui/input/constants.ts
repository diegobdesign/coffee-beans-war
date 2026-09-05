/** UX.md §3.2, §3.7; ARCHITECTURE.md §11.4. Layout constants, JS never reads env(). */
export const AIM_DEAD_ZONE_PX = 88; // bottom band: no drag origin, no release target
export const DRAG_DEAD_ZONE_PX = 12; // below this nothing arms
export const POWER_FLOOR_PER_MILLE = 80; // releasing below cancels
export const MIN_DRAG_MS = 120; // a faster flick is a tap
export const ORIGIN_BAND_PORTRAIT: readonly [number, number] = [0.28, 0.65];
export const ORIGIN_BAND_LANDSCAPE_TOP_PX = 64;
export const HUD_STRIP_LANDSCAPE_PX = 96;
export const LANDSCAPE_DEAD_ZONE_PX = 56;
