import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  SphereGeometry,
  Vector2,
} from 'three';
import { opaque, paint } from '../render/materials';
import { TOKENS } from '../render/tokens';
import type { BeanClass } from '../sim/types';

/**
 * Bean base: a lathe of 12 segments over 9 rings, flat shaded, ≤ 240 triangles (ART-DIRECTION §4),
 * plus dot eyes, a straight mouth, and the stick limbs Diego asked for (§4 Limbs).
 * The group's origin is the bean's centre; local +x is the bean's forward.
 */
const PROPORTIONS: Record<BeanClass, { w: number; d: number; lean: number }> = {
  arabica: { w: 0.62, d: 0.5, lean: 8 },
  robusta: { w: 0.85, d: 0.7, lean: 0 },
  liberica: { w: 0.7, d: 0.55, lean: 15 },
};

function profile(): Vector2[] {
  const pts: Vector2[] = [];
  const rings = 9;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const y = t - 0.5;
    const r = Math.sqrt(Math.max(0, 0.25 - y * y));
    pts.push(new Vector2(r, y));
  }
  return pts;
}

export interface Bean {
  group: Group;
  body: Mesh;
}

export function createBean(cls: BeanClass, roastHex: number): Bean {
  const group = new Group();
  const geo = new LatheGeometry(profile(), 12).toNonIndexed();
  geo.computeVertexNormals();
  paint(geo, roastHex);
  const body = new Mesh(geo, opaque);
  const p = PROPORTIONS[cls];
  body.scale.set(p.w, 1, p.d);
  body.rotation.z = (-p.lean * Math.PI) / 180;
  body.castShadow = true;

  // crease: a thin dark strip down the front
  const crease = new Mesh(paint(new BoxGeometry(0.03, 0.9, 0.05), TOKENS.roast.burnt), opaque);
  crease.position.set(0.485, 0, 0);
  body.add(crease);

  // face: two ink dots and one straight mouth, hard cut cells later (ART-DIRECTION §4)
  const eyeGeo = paint(new SphereGeometry(0.045, 6, 4), TOKENS.ink);
  for (const z of [-0.14, 0.14]) {
    const eye = new Mesh(eyeGeo, opaque);
    eye.position.set(0.46, 0.14, z);
    body.add(eye);
  }
  const mouth = new Mesh(paint(new BoxGeometry(0.03, 0.02, 0.14), TOKENS.ink), opaque);
  mouth.position.set(0.485, -0.04, 0);
  body.add(mouth);
  group.add(body);

  // limbs: ink sticks, ≤ 40 tris total
  const limbGeo = paint(new CylinderGeometry(0.025, 0.025, 0.28, 4), TOKENS.ink);
  for (const z of [-0.12, 0.12]) {
    const leg = new Mesh(limbGeo, opaque);
    leg.position.set(0, -0.55, z * p.d);
    leg.castShadow = true;
    group.add(leg);
  }
  for (const z of [-1, 1]) {
    const arm = new Mesh(limbGeo, opaque);
    arm.position.set(0.05, -0.05, z * (0.5 * p.d + 0.08));
    arm.rotation.x = z * 0.35;
    group.add(arm);
  }
  return { group, body };
}
