import type { Ammo, BeanClass, Machine, Stance } from './types';

/** Every ⚖️ balance knob from GAME-DESIGN.md lives here. Change numbers here, then `npm run gen:golden`. */

export const DT = 1 / 120;
export const MAX_STEPS = 400;
export const STAGE_WIDTH = 28;
export const SIDE_X: readonly [number, number] = [4, 24];
export const GRAVITY = -20;
export const V_MAX = 30;
/** horizontal acceleration per steam unit at mass 1 */
export const K_STEAM = 0.35;
export const BEAN_RADIUS = 0.5;
export const MAX_TURNS = 64;
export const SUDDEN_DEATH_ROUNDS = 8;
export const SUDDEN_DEATH_DRAIN = 5;
export const FOG_RADIUS = 1.5;
export const FOG_RADIUS_CUP = 2.0;
export const CLOSE_RADIUS = 2.0;
export const CLOSE_RADIUS_ARABICA = 3.0;

export const STANCE: Record<
  Stance,
  { height: number; damageMult: number; splashTakenMult: number }
> = {
  mountain: { height: 3, damageMult: 1.0, splashTakenMult: 1.0 },
  tree: { height: 1.5, damageMult: 1.0, splashTakenMult: 0.75 },
  flood: { height: 0, damageMult: 1.1, splashTakenMult: 0.5 },
};

export const CLASS: Record<BeanClass, { cup: number; spreadDeciDeg: number; wildChance: number }> =
  {
    arabica: { cup: 90, spreadDeciDeg: 0, wildChance: 0 },
    robusta: { cup: 120, spreadDeciDeg: 20, wildChance: 0 },
    liberica: { cup: 100, spreadDeciDeg: 40, wildChance: 0.1 },
  };

export const MACHINE: Record<
  Machine,
  { speed: number; splashMult: number; misfireAbovePerMille: number | null; steamMult: number }
> = {
  moka: { speed: 0.85, splashMult: 1.25, misfireAbovePerMille: null, steamMult: 1 },
  press: { speed: 1.1, splashMult: 1, misfireAbovePerMille: 850, steamMult: 1 },
  espresso: { speed: 1.2, splashMult: 1, misfireAbovePerMille: null, steamMult: 1 },
  aeropress: { speed: 1.4, splashMult: 1, misfireAbovePerMille: null, steamMult: 0.5 },
};

export const AMMO: Record<
  Ammo,
  { damage: number; mass: number; radius: number; pellets: number; spreadDeciDeg: number }
> = {
  green: { damage: 20, mass: 1.0, radius: 0, pellets: 1, spreadDeciDeg: 0 },
  dark: { damage: 35, mass: 1.6, radius: 0.5, pellets: 1, spreadDeciDeg: 0 },
  ground: { damage: 5, mass: 0.4, radius: 0, pellets: 6, spreadDeciDeg: 60 },
  cup: { damage: 25, mass: 1.2, radius: 2.0, pellets: 1, spreadDeciDeg: 0 },
};

export const RACK = { dark: 3, ground: 2, cup: 1 } as const;
export const DOUBLE_SHOT_DAMAGE_MULT = 0.6;
export const WILD_SHOT_DAMAGE_MULT = 2;
export const MISFIRE_POWER_PER_MILLE = 300;
