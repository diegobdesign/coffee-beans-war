import { Group } from 'three';
import { createBean, type Bean } from '../../assets/bean';
import { createMachine } from '../../assets/machines';
import { buildStage as buildStageProfile, heightAt } from '../../sim/terrain';
import type { DuelSetup } from '../../sim/types';
import { buildStage } from './stage';

export interface GraphActor {
  readonly bean: Bean;
  readonly machine: Group;
  readonly forward: 1 | -1;
}

export interface DuelGraph {
  readonly group: Group;
  readonly actors: readonly [GraphActor, GraphActor];
}

/**
 * The static duel scene graph, with no renderer, canvas or texture: stage, two beans, two machines.
 * Pure enough to build in Node, which is what lets test/budget.spec.ts gate triangles and draw calls in CI.
 */
export function buildDuelGraph(
  setup: DuelSetup,
  roast: readonly [number, number],
  accent: readonly [number, number],
): DuelGraph {
  const g = new Group();
  const stage = buildStageProfile(setup);
  g.add(buildStage(setup, stage));
  const actors: GraphActor[] = [];
  for (const side of [0, 1] as const) {
    const s = setup.sides[side];
    const forward: 1 | -1 = side === 0 ? 1 : -1;
    const bean = createBean(s.beanClass, roast[side]);
    bean.group.position.set(stage.beanX[side], stage.beanY[side] + 0.62, 0);
    bean.group.rotation.y = forward === 1 ? 0 : Math.PI;
    g.add(bean.group);
    const mx = stage.beanX[side] + forward * 1.3;
    const machine = createMachine(s.machine, accent[side]);
    machine.position.set(mx, heightAt(stage, mx), 0.1);
    machine.rotation.y = forward === 1 ? 0 : Math.PI;
    g.add(machine);
    actors.push({ bean, machine, forward });
  }
  const [a0, a1] = actors;
  if (a0 === undefined || a1 === undefined) throw new Error('graph actors');
  return { group: g, actors: [a0, a1] };
}
