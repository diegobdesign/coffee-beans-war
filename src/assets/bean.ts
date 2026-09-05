import { BufferAttribute, Color, LatheGeometry, Mesh, Vector2 } from 'three';
import { opaque } from '../render/materials';
import type { BeanClass } from '../core/types';

/**
 * Bean base: a lathe of 12 segments over 9 rings, flat shaded, ≤ 240 triangles (ART-DIRECTION §4).
 * Class changes proportions only; roast changes the vertex colour only.
 */
const PROPORTIONS: Record<BeanClass, { w: number; d: number; lean: number }> = {
  arabica: { w: 0.62, d: 0.5, lean: 8 },
  robusta: { w: 0.85, d: 0.7, lean: 0 },
  liberica: { w: 0.7, d: 0.55, lean: 15 },
};

function profile(): Vector2[] {
  // half-ellipse profile, height 1.0, 9 rings from bottom to top
  const pts: Vector2[] = [];
  const rings = 9;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings; // 0 bottom .. 1 top
    const y = t - 0.5;
    const r = Math.sqrt(Math.max(0, 0.25 - y * y)) * 1.0;
    pts.push(new Vector2(r, y));
  }
  return pts;
}

export function createBean(cls: BeanClass, roastHex: number): Mesh {
  const geo = new LatheGeometry(profile(), 12);
  const count = geo.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const c = new Color(roastHex);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, opaque);
  const p = PROPORTIONS[cls];
  mesh.scale.set(p.w, 1, p.d);
  mesh.rotation.z = (-p.lean * Math.PI) / 180;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}
