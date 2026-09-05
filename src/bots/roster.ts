import type { BeanClass, Machine, Stance } from '../sim/types';
import type { Roast } from '../core/types';

export interface Bot {
  readonly name: string;
  readonly origin: string;
  readonly beanClass: BeanClass;
  readonly roast: Roast;
  readonly stance: Stance;
  readonly machine: Machine;
}

/** The 12 permanent bots (ART-DIRECTION §4). Names never exceed 14 chars. */
export const ROSTER: readonly Bot[] = [
  {
    name: 'Decaf Dan',
    origin: 'CRI',
    beanClass: 'liberica',
    roast: 'green',
    stance: 'flood',
    machine: 'press',
  },
  {
    name: 'Cold Brew Su',
    origin: 'KEN',
    beanClass: 'arabica',
    roast: 'green',
    stance: 'tree',
    machine: 'moka',
  },
  {
    name: 'Lil Ristretto',
    origin: 'ETH',
    beanClass: 'arabica',
    roast: 'light',
    stance: 'mountain',
    machine: 'espresso',
  },
  {
    name: 'Frenchie Press',
    origin: 'KEN',
    beanClass: 'liberica',
    roast: 'light',
    stance: 'tree',
    machine: 'press',
  },
  {
    name: 'Señor Crema',
    origin: 'COL',
    beanClass: 'arabica',
    roast: 'medium',
    stance: 'mountain',
    machine: 'espresso',
  },
  {
    name: 'Tamp Tamp',
    origin: 'IDN',
    beanClass: 'robusta',
    roast: 'medium',
    stance: 'flood',
    machine: 'moka',
  },
  {
    name: 'Miss Moka',
    origin: 'GTM',
    beanClass: 'liberica',
    roast: 'medium',
    stance: 'tree',
    machine: 'moka',
  },
  {
    name: 'Bitter Ted',
    origin: 'BRA',
    beanClass: 'robusta',
    roast: 'dark',
    stance: 'mountain',
    machine: 'moka',
  },
  {
    name: 'Big Robusto',
    origin: 'VNM',
    beanClass: 'robusta',
    roast: 'dark',
    stance: 'flood',
    machine: 'press',
  },
  {
    name: 'Yirga Chef',
    origin: 'ETH',
    beanClass: 'arabica',
    roast: 'dark',
    stance: 'tree',
    machine: 'aeropress',
  },
  {
    name: 'Dregs',
    origin: 'VNM',
    beanClass: 'robusta',
    roast: 'burnt',
    stance: 'flood',
    machine: 'press',
  },
  {
    name: 'Blend 42',
    origin: 'BRA',
    beanClass: 'liberica',
    roast: 'burnt',
    stance: 'mountain',
    machine: 'aeropress',
  },
];

/** Aim noise in degrees by roast tier (GAME-DESIGN §10). Burnt bots aim like Dark. */
export const SIGMA_DEG: Record<Roast, number> = {
  green: 6,
  light: 4,
  medium: 2.5,
  dark: 1.5,
  burnt: 1.5,
};
