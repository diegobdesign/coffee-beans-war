import { DirectionalLight, HemisphereLight, type Scene } from 'three';
import { TOKENS } from './tokens';
import { sinDeciDeg, cosDeciDeg } from '../sim/trig';

/** ART-DIRECTION §2 lighting model: one warm key at 32° elevation, 40° azimuth, plus a hemisphere fill. */
export function addLights(scene: Scene): DirectionalLight {
  const key = new DirectionalLight(TOKENS.keyLight, 2.2);
  const elev = 320;
  const azim = 400;
  const r = 20;
  key.position.set(
    r * cosDeciDeg(elev) * sinDeciDeg(azim) * -1,
    r * sinDeciDeg(elev),
    r * cosDeciDeg(elev) * cosDeciDeg(azim),
  );
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  scene.add(key);

  const fill = new HemisphereLight(TOKENS.skyZenith, TOKENS.soil, 0.55 * 2.2);
  scene.add(fill);
  return key;
}
