import { BufferAttribute, Color, Mesh, PlaneGeometry } from 'three';
import { opaque } from '../render/materials';
import { TOKENS } from '../render/tokens';

export function createGround(size = 20): Mesh {
  const geo = new PlaneGeometry(size, size, 1, 1);
  const count = geo.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const c = new Color(TOKENS.soil);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  const mesh = new Mesh(geo, opaque);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
