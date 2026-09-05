import { STAGE_WIDTH } from '../sim/rules';
import type { Call, Side } from '../sim/types';

/** The bot's belief about where you are. Updated from the same calls the player gets (GAME-DESIGN §2b, §10). */
export interface Estimate {
  readonly x: number;
  readonly sigma: number;
}

/** Start at the target's band with a seeded bias, so the bot has to walk in like a person would. */
export function initialEstimate(targetX: number, bias: number): Estimate {
  const x = Math.max(1, Math.min(STAGE_WIDTH - 1, targetX + bias));
  return { x, sigma: 3 };
}

export function updateEstimate(e: Estimate, shooter: Side, impactX: number, call: Call): Estimate {
  const forward = shooter === 0 ? 1 : -1;
  switch (call) {
    case 'close':
      return { x: impactX, sigma: Math.max(0.4, e.sigma * 0.35) };
    case 'short':
      return { x: e.x + forward * e.sigma * 0.5, sigma: Math.max(0.5, e.sigma * 0.6) };
    case 'long':
      return { x: e.x - forward * e.sigma * 0.5, sigma: Math.max(0.5, e.sigma * 0.6) };
  }
}
