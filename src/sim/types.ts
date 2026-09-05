export type Stance = 'mountain' | 'tree' | 'flood';
export type BeanClass = 'arabica' | 'robusta' | 'liberica';
export type Machine = 'moka' | 'press' | 'espresso' | 'aeropress';
export type Ammo = 'green' | 'dark' | 'ground' | 'cup';
export type Side = 0 | 1;
export type Call = 'close' | 'short' | 'long';
export type ImpactKind = 'dust' | 'splash' | 'leaf' | 'direct' | 'offstage';
export type Outcome = 'active' | 'side0' | 'side1' | 'draw';

/** The complete stored record of one shot. Integers only, deliberately (ARCHITECTURE §3.1, §11). */
export interface TurnInput {
  readonly turnIndex: number; // 0..63
  /** tenths of a degree from the shooter's forward direction; -150..900 */
  readonly angleDeciDeg: number;
  readonly powerPerMille: number; // 0..1000
  readonly ammo: Ammo;
  /** espresso only: fire two small beans (ARCHITECTURE §11, GAME-DESIGN §16) */
  readonly doubleShot: boolean;
}

export interface SideSetup {
  readonly beanClass: BeanClass;
  readonly machine: Machine;
  readonly stance: Stance;
}

/** Fixed for the whole duel. Comes from the duel row; never changes. */
export interface DuelSetup {
  readonly duelSeed: number; // uint32
  readonly sides: readonly [SideSetup, SideSetup];
  /** turn index from which sudden death applies; null until the server freezes it (ARCHITECTURE §11) */
  readonly suddenDeathFrom: number | null;
}

export interface Impact {
  readonly turnIndex: number;
  readonly firedBy: Side;
  readonly x: number;
  readonly y: number;
  readonly fogRadius: number;
  readonly kind: ImpactKind;
}

export interface AmmoRack {
  readonly dark: number;
  readonly ground: number;
  readonly cup: number;
}

/** Derived, never stored. Always the fold of TurnInput[0..n] over the initial state. */
export interface DuelState {
  readonly turnIndex: number;
  readonly toMove: Side;
  readonly hp: readonly [number, number];
  readonly ammoLeft: readonly [AmmoRack, AmmoRack];
  /** this turn's steam, -10..10 (doubled in sudden death) */
  readonly steam: number;
  readonly impacts: readonly Impact[];
  readonly outcome: Outcome;
}

export interface ShotResult {
  /** [x, y] pairs, one per fixed step, for playback. Stage space. */
  readonly trajectories: readonly Float64Array[];
  readonly impacts: readonly Impact[];
  readonly damage: number;
  readonly hitSide: Side | null;
  readonly call: Call;
  readonly misfire: boolean;
  readonly wildShot: boolean;
  readonly hash: number;
}
