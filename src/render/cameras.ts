import { OrthographicCamera } from 'three';

/** Duel camera: orthographic, side on, 6° down (ART-DIRECTION §2). Stage width in world units. */
export function createDuelCamera(stageWidth: number, aspect: number): OrthographicCamera {
  const halfW = stageWidth / 2;
  const halfH = halfW / aspect;
  const cam = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 200);
  cam.position.set(0, 3, 30);
  cam.rotation.x = (-6 * Math.PI) / 180;
  return cam;
}

export function fitDuelCamera(cam: OrthographicCamera, stageWidth: number, aspect: number): void {
  const halfW = stageWidth / 2;
  const halfH = halfW / aspect;
  cam.left = -halfW;
  cam.right = halfW;
  cam.top = halfH;
  cam.bottom = -halfH;
  cam.updateProjectionMatrix();
}
