import {
  Color,
  Fog,
  NoToneMapping,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { TOKENS } from './tokens';

export interface Gl {
  renderer: WebGLRenderer;
  scene: Scene;
  resize(width: number, height: number): void;
}

export interface GlEvents {
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

/** True when the device can run us at all. Checked before any scene is built (QA.md C2). */
export function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    return c.getContext('webgl2') !== null || c.getContext('webgl') !== null;
  } catch {
    return false;
  }
}

export function createGl(canvas: HTMLCanvasElement, events: GlEvents = {}): Gl {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const isMobile = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  // counters cover the whole frame (main pass + Spotter pass); reset once per frame in the view
  renderer.info.autoReset = false;

  const scene = new Scene();
  scene.background = new Color(TOKENS.skyZenith);
  scene.fog = new Fog(TOKENS.skyHorizon, 25, 80); // mid band ~55%, far band ~85% at the duel camera (ART-DIRECTION §2)

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // without this the context is gone for good (ARCHITECTURE §2.9)
    events.onContextLost?.();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    events.onContextRestored?.();
  });

  return {
    renderer,
    scene,
    resize(width, height) {
      renderer.setSize(width, height, false);
    },
  };
}
