import type { OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { Group } from 'three';
import { createBean } from '../../assets/bean';
import { createMachine } from '../../assets/machines';
import type { Frame } from '../../core/clock';
import { buildStage as buildStageProfile, heightAt, type Stage } from '../../sim/terrain';
import { STAGE_WIDTH } from '../../sim/rules';
import type { DuelSetup, Side } from '../../sim/types';
import { createDuelCamera, fitDuelCamera } from '../cameras';
import { addLights } from '../lights';
import { createGl } from '../renderer';
import { buildStage } from './stage';

export interface DuelViewOptions {
  readonly roast: readonly [number, number];
  readonly accent: readonly [number, number];
}

export interface DuelView {
  readonly stage: Stage;
  readonly camera: OrthographicCamera;
  readonly scene: Scene;
  readonly renderer: WebGLRenderer;
  frame(f: Frame): void;
  dispose(): void;
}

const GROUND_LINE_LANDSCAPE = 0.22;
const GROUND_LINE_PORTRAIT = 0.42;

export function createDuelView(
  canvas: HTMLCanvasElement,
  setup: DuelSetup,
  opts: DuelViewOptions,
): DuelView {
  const gl = createGl(canvas);
  const key = addLights(gl.scene);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 32;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.far = 80;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.target.position.set(STAGE_WIDTH / 2, 0, 0);
  gl.scene.add(key.target);

  const stage = buildStageProfile(setup);
  gl.scene.add(buildStage(setup, stage));

  const actors = new Group();
  for (const side of [0, 1] as const) {
    const s = setup.sides[side];
    const forward = side === 0 ? 1 : -1;
    const bean = createBean(s.beanClass, opts.roast[side]);
    bean.group.position.set(stage.beanX[side], stage.beanY[side] + 0.62, 0);
    bean.group.rotation.y = forward === 1 ? 0 : Math.PI;
    actors.add(bean.group);
    const mx = stage.beanX[side] + forward * 1.3;
    const machine = createMachine(s.machine, opts.accent[side]);
    machine.position.set(mx, heightAt(stage, mx), 0.1);
    machine.rotation.y = forward === 1 ? 0 : Math.PI;
    actors.add(machine);
  }
  gl.scene.add(actors);

  const camera = createDuelCamera(STAGE_WIDTH, 16 / 9);
  const layout = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    gl.resize(w, h);
    const portrait = h > w;
    const width = STAGE_WIDTH + 2;
    fitDuelCamera(camera, width, w / h);
    const halfH = camera.top;
    const groundLine = portrait ? GROUND_LINE_PORTRAIT : GROUND_LINE_LANDSCAPE;
    // place y = 0 at the ground line fraction from the bottom of the viewport
    camera.position.set(STAGE_WIDTH / 2, halfH - groundLine * 2 * halfH + 1.2, 30);
    gl.renderer.shadowMap.needsUpdate = true;
  };
  layout();
  window.addEventListener('resize', layout);
  gl.renderer.shadowMap.autoUpdate = false;
  gl.renderer.shadowMap.needsUpdate = true;

  return {
    stage,
    camera,
    scene: gl.scene,
    renderer: gl.renderer,
    frame() {
      gl.renderer.render(gl.scene, camera);
    },
    dispose() {
      window.removeEventListener('resize', layout);
      gl.renderer.dispose();
    },
  };
}

export function sideLabel(setup: DuelSetup, side: Side): string {
  const st = setup.sides[side].stance;
  switch (st) {
    case 'mountain':
      return 'RIDGE +3';
    case 'tree':
      return 'BELT +1.5';
    case 'flood':
      return 'BREW 0';
  }
}
