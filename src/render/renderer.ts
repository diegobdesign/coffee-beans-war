import {
  Color,
  Fog,
  NoToneMapping,
  PCFSoftShadowMap,
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

export function createGl(canvas: HTMLCanvasElement): Gl {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const isMobile = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

  const scene = new Scene();
  scene.background = new Color(TOKENS.skyZenith);
  scene.fog = new Fog(TOKENS.skyHorizon, 30, 70);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
  });

  return {
    renderer,
    scene,
    resize(width, height) {
      renderer.setSize(width, height, false);
    },
  };
}
