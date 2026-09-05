import type { OrthographicCamera, Scene, WebGLRenderer } from 'three';
import type { Group, Object3D } from 'three';
import { createBean, type Bean } from '../../assets/bean';
import { createMachine } from '../../assets/machines';
import type { Frame } from '../../core/clock';
import { buildStage as buildStageProfile, heightAt, type Stage } from '../../sim/terrain';
import { STAGE_WIDTH } from '../../sim/rules';
import type { DuelSetup, Side } from '../../sim/types';
import { createDuelCamera, fitDuelCamera } from '../cameras';
import { addLights } from '../lights';
import { createGl } from '../renderer';
import { createShotLayer, type ShotLayer } from './shot';
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
  readonly shots: ShotLayer;
  /** angle in deci-degrees from the shooter's forward, or null to drop the aim pose */
  setAim(side: Side, angleDd: number | null): void;
  squash(side: Side): void;
  hitReact(side: Side): void;
  shake(): void;
  hitStop(ms: number): void;
  frame(f: Frame): void;
  dispose(): void;
}

const GROUND_LINE_LANDSCAPE = 0.22;
const GROUND_LINE_PORTRAIT = 0.42;
const FOLLOW_S = 0.06;

interface Actor {
  bean: Bean;
  machine: Group;
  forward: 1 | -1;
  aimTarget: number | null;
  aimCurrent: number;
  arm: Object3D | null;
  squashT: number;
  hitT: number;
}

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
  const shots = createShotLayer(gl.scene);

  const actors: [Actor, Actor] = [0, 1].map((i) => {
    const side = i as Side;
    const s = setup.sides[side];
    const forward: 1 | -1 = side === 0 ? 1 : -1;
    const bean = createBean(s.beanClass, opts.roast[side]);
    bean.group.position.set(stage.beanX[side], stage.beanY[side] + 0.62, 0);
    bean.group.rotation.y = forward === 1 ? 0 : Math.PI;
    gl.scene.add(bean.group);
    const mx = stage.beanX[side] + forward * 1.3;
    const machine = createMachine(s.machine, opts.accent[side]);
    machine.position.set(mx, heightAt(stage, mx), 0.1);
    machine.rotation.y = forward === 1 ? 0 : Math.PI;
    gl.scene.add(machine);
    // the far arm is the last child added in createBean (z = +1 side)
    const arm = bean.group.children[bean.group.children.length - 1] ?? null;
    return { bean, machine, forward, aimTarget: null, aimCurrent: 0, arm, squashT: 0, hitT: 0 };
  }) as [Actor, Actor];

  const camera = createDuelCamera(STAGE_WIDTH, 16 / 9);
  let baseY = 0;
  const layout = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    gl.resize(w, h);
    const portrait = h > w;
    fitDuelCamera(camera, STAGE_WIDTH + 2, w / h);
    const halfH = camera.top;
    const groundLine = portrait ? GROUND_LINE_PORTRAIT : GROUND_LINE_LANDSCAPE;
    baseY = halfH - groundLine * 2 * halfH + 1.2;
    camera.position.set(STAGE_WIDTH / 2, baseY, 30);
    gl.renderer.shadowMap.needsUpdate = true;
  };
  layout();
  window.addEventListener('resize', layout);
  gl.renderer.shadowMap.autoUpdate = false;
  gl.renderer.shadowMap.needsUpdate = true;

  let shakeT = 0;
  let stopUntil = 0;
  let now = 0;

  return {
    stage,
    camera,
    scene: gl.scene,
    renderer: gl.renderer,
    shots,
    setAim(side, angleDd) {
      const a = actors[side];
      a.aimTarget = angleDd;
    },
    squash(side) {
      actors[side].squashT = 0.08;
    },
    hitReact(side) {
      actors[side].hitT = 0.6;
      actors[side].squashT = 0.08;
    },
    shake() {
      shakeT = 0.18;
    },
    hitStop(ms) {
      stopUntil = now + ms / 1000;
    },
    frame(f) {
      now += f.dt;
      if (now < stopUntil) {
        gl.renderer.render(gl.scene, camera);
        return;
      }
      const k = Math.min(1, f.dt / FOLLOW_S);
      for (const a of actors) {
        const target = a.aimTarget ?? 0;
        a.aimCurrent += (target - a.aimCurrent) * k;
        const rad = (a.aimCurrent / 10) * (Math.PI / 180);
        a.machine.rotation.z = a.aimTarget === null ? 0 : rad * 0.6 * -1 + 0;
        // machines pivot on their base toward the aim; the far arm points along it
        a.machine.rotation.z = -rad * 0.6;
        if (a.arm !== null) {
          a.arm.rotation.z = a.aimTarget === null ? 0 : Math.PI / 2 - rad;
          a.arm.rotation.x = a.aimTarget === null ? 0.35 : 0;
        }
        if (a.squashT > 0) {
          a.squashT -= f.dt;
          a.bean.body.scale.y = a.squashT > 0.04 ? 0.85 : 1.15;
          if (a.squashT <= 0) a.bean.body.scale.y = 1;
        }
        if (a.hitT > 0) {
          a.hitT -= f.dt;
          a.bean.group.rotation.z = a.forward * 0.25 * Math.max(0, a.hitT / 0.6);
        }
      }
      if (shakeT > 0) {
        shakeT -= f.dt;
        const decay = Math.max(0, shakeT / 0.18);
        const amp = 0.25 * decay * decay; // world units, ~6px
        const phase = shakeT * 3 * Math.PI * 2 * (1 / 0.18);
        camera.position.y = baseY + amp * Math.sin(phase);
        camera.position.x = STAGE_WIDTH / 2 + amp * 0.5 * Math.cos(phase * 1.3);
        if (shakeT <= 0) camera.position.set(STAGE_WIDTH / 2, baseY, 30);
      }
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
