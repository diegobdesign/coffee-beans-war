import type { Frame } from '../core/clock';
import { createGl } from './renderer';
import { addLights } from './lights';
import { createDuelCamera, fitDuelCamera } from './cameras';
import { createBean } from '../assets/bean';
import { createGround } from '../assets/ground';
import { TOKENS } from './tokens';

/**
 * M0 slice 1 smoke scene: proves the renderer, lighting model, flat shading, shadows and the
 * three class silhouettes on a real device. Replaced by the duel stage in slice 3.
 */
export function startSmokeScene(canvas: HTMLCanvasElement): {
  frame(f: Frame): void;
  dispose(): void;
} {
  const gl = createGl(canvas);
  addLights(gl.scene);
  gl.scene.add(createGround(30));

  const beans = [
    createBean('arabica', TOKENS.roast.light),
    createBean('robusta', TOKENS.roast.medium),
    createBean('liberica', TOKENS.roast.dark),
  ];
  beans.forEach((b, i) => {
    b.position.set((i - 1) * 2.2, 0.5, 0);
    gl.scene.add(b);
  });

  const stageWidth = 10;
  const camera = createDuelCamera(stageWidth, 16 / 9);
  camera.position.y = 1.2;

  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    gl.resize(w, h);
    fitDuelCamera(camera, w >= h ? stageWidth : 7, w / h);
  };
  resize();
  window.addEventListener('resize', resize);

  return {
    frame(f) {
      for (const b of beans) b.rotation.y += f.dt * 0.6;
      gl.renderer.render(gl.scene, camera);
    },
    dispose() {
      window.removeEventListener('resize', resize);
      gl.renderer.dispose();
    },
  };
}
