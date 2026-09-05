import { OrthographicCamera } from 'three';
import type { Group, Object3D, Scene, WebGLRenderer } from 'three';
import type { Bean } from '../../assets/bean';
import type { Frame } from '../../core/clock';
import { STAGE_WIDTH } from '../../sim/rules';
import { buildStage as buildStageProfile, type Stage } from '../../sim/terrain';
import type { DuelSetup, Side } from '../../sim/types';
import { createDuelCamera, fitDuelCamera } from '../cameras';
import { addLights } from '../lights';
import { createGl } from '../renderer';
import { createFogVeil, FOG_LAYER, type FogVeil } from './fog';
import { buildDuelGraph, type GraphActor } from './graph';
import { createShotLayer, type ShotLayer } from './shot';

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
  readonly fog: FogVeil;
  /** the DOM element whose rect the Spotter renders into; set once by the HUD */
  setSpotterElement(el: HTMLElement | null): void;
  /** fade the veil out over ms (KO) */
  liftFog(ms: number): void;
  /** angle in deci-degrees from the shooter's forward, or null to drop the aim pose */
  setAim(side: Side, angleDd: number | null): void;
  squash(side: Side): void;
  hitReact(side: Side): void;
  shake(): void;
  hitStop(ms: number): void;
  /** render pass only; call once per frame after update */
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
  arm: Object3D;
  squashT: number;
  hitT: number;
}

function toActor(a: GraphActor): Actor {
  return {
    bean: a.bean,
    machine: a.machine,
    forward: a.forward,
    aimTarget: null,
    aimCurrent: 0,
    arm: a.bean.arm,
    squashT: 0,
    hitT: 0,
  };
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
  const graph = buildDuelGraph(setup, opts.roast, opts.accent);
  gl.scene.add(graph.group);
  const shots = createShotLayer(gl.scene);
  const fog = createFogVeil(gl.scene);
  const actors: [Actor, Actor] = [toActor(graph.actors[0]), toActor(graph.actors[1])];

  const camera = createDuelCamera(STAGE_WIDTH, 16 / 9);
  camera.layers.enable(FOG_LAYER);
  // the Spotter: a tight live crop of the opponent, ±2.2 units, no scale cue (GAME-DESIGN §2b)
  const spotter = new OrthographicCamera(-2.2, 2.2, 2.8, -1.6, 0.1, 200);
  spotter.position.set(stage.beanX[1], stage.beanY[1], 30);
  spotter.layers.set(0);
  let spotterEl: HTMLElement | null = null;
  let baseY = 0;
  let liftFrom = 0;
  let liftMs = 0;

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

  const renderAll = (): void => {
    const r = gl.renderer;
    r.info.reset();
    r.setScissorTest(false);
    const w = window.innerWidth;
    const h = window.innerHeight;
    r.setViewport(0, 0, w, h);
    r.render(gl.scene, camera);
    if (spotterEl !== null) {
      const rect = spotterEl.getBoundingClientRect();
      const size = Math.round(rect.width);
      const x = Math.round(rect.left);
      const y = Math.round(h - rect.bottom);
      r.setScissorTest(true);
      r.setScissor(x, y, size, size);
      r.setViewport(x, y, size, size);
      r.clearDepth();
      r.render(gl.scene, spotter);
      r.setScissorTest(false);
      r.setViewport(0, 0, w, h);
    }
  };

  return {
    stage,
    camera,
    scene: gl.scene,
    renderer: gl.renderer,
    shots,
    fog,
    setSpotterElement(el) {
      spotterEl = el;
    },
    liftFog(ms) {
      liftFrom = now;
      liftMs = ms / 1000;
    },
    setAim(side, angleDd) {
      actors[side].aimTarget = angleDd;
    },
    squash(side) {
      actors[side].squashT = 0.08;
    },
    hitReact(side) {
      actors[side].hitT = 0.6;
      actors[side].squashT = 0.08;
      gl.renderer.shadowMap.needsUpdate = true;
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
        renderAll();
        return;
      }
      if (liftMs > 0) fog.setLift(Math.min(1, (now - liftFrom) / liftMs));
      const k = Math.min(1, f.dt / FOLLOW_S);
      for (const a of actors) {
        const target = a.aimTarget ?? 0;
        a.aimCurrent += (target - a.aimCurrent) * k;
        const rad = (a.aimCurrent / 10) * (Math.PI / 180);
        // machines pivot on their base toward the aim; the far arm points along it
        a.machine.rotation.z = a.aimTarget === null ? 0 : -rad * 0.6;
        a.arm.rotation.z = a.aimTarget === null ? 0 : Math.PI / 2 - rad;
        a.arm.rotation.x = a.aimTarget === null ? 0.35 : 0;
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
        const amp = 0.25 * decay * decay;
        const phase = shakeT * 3 * Math.PI * 2 * (1 / 0.18);
        camera.position.y = baseY + amp * Math.sin(phase);
        camera.position.x = STAGE_WIDTH / 2 + amp * 0.5 * Math.cos(phase * 1.3);
        if (shakeT <= 0) camera.position.set(STAGE_WIDTH / 2, baseY, 30);
      }
      renderAll();
    },
    dispose() {
      window.removeEventListener('resize', layout);
      fog.dispose();
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
