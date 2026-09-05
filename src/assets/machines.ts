import { BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry } from 'three';
import { glass, opaque, paint } from '../render/materials';
import { TOKENS } from '../render/tokens';
import type { Machine } from '../sim/types';

const CHROME = 0xc9c6c0;
const WOOD = TOKENS.trunk;

function part(geo: Parameters<typeof paint>[0], hex: number, mat = opaque): Mesh {
  const m = new Mesh(paint(geo, hex), mat);
  m.castShadow = true;
  return m;
}

/** ART-DIRECTION §5. Each ≤ 400 tris from primitives. Origin at the base; local +x is toward the opponent. */
export function createMachine(kind: Machine, accentHex: number): Group {
  const g = new Group();
  switch (kind) {
    case 'moka': {
      const lower = part(new CylinderGeometry(0.42, 0.36, 0.5, 8), TOKENS.ink);
      lower.position.y = 0.25;
      const collar = part(new CylinderGeometry(0.3, 0.3, 0.1, 8), accentHex);
      collar.position.y = 0.55;
      const upper = part(new CylinderGeometry(0.34, 0.42, 0.5, 8), CHROME);
      upper.position.y = 0.85;
      const lid = part(new CylinderGeometry(0.34, 0.34, 0.06, 8), CHROME);
      lid.position.set(0.18, 1.18, 0);
      lid.rotation.z = -0.9;
      const handle = part(new BoxGeometry(0.1, 0.35, 0.12), TOKENS.ink);
      handle.position.set(-0.5, 0.85, 0);
      const tilt = new Group();
      tilt.add(lower, collar, upper, lid, handle);
      tilt.rotation.z = -0.5; // tilted back on its base like a mortar
      tilt.position.y = 0.08;
      g.add(tilt);
      break;
    }
    case 'press': {
      const cradle = part(new BoxGeometry(0.9, 0.3, 0.5), WOOD);
      cradle.position.y = 0.15;
      const cyl = part(new CylinderGeometry(0.28, 0.28, 1.1, 10), CHROME, glass);
      cyl.rotation.z = Math.PI / 2 - 0.35;
      cyl.position.set(0.1, 0.62, 0);
      const cap = part(new CylinderGeometry(0.3, 0.3, 0.08, 10), CHROME);
      cap.rotation.z = Math.PI / 2 - 0.35;
      cap.position.set(-0.42, 0.44, 0);
      const rod = part(new CylinderGeometry(0.03, 0.03, 0.5, 5), CHROME);
      rod.rotation.z = Math.PI / 2 - 0.35;
      rod.position.set(-0.7, 0.34, 0);
      const knob = part(new SphereGeometry(0.07, 6, 4), TOKENS.ink);
      knob.position.set(-0.94, 0.26, 0);
      const trim = part(new TorusGeometry(0.29, 0.03, 4, 10), accentHex);
      trim.rotation.y = Math.PI / 2 - 0.35;
      trim.position.set(0.55, 0.78, 0);
      g.add(cradle, cyl, cap, rod, knob, trim);
      break;
    }
    case 'espresso': {
      const body = part(new BoxGeometry(0.8, 1.0, 0.7), TOKENS.ink);
      body.position.y = 0.5;
      const trimBand = part(new BoxGeometry(0.82, 0.05, 0.72), accentHex);
      trimBand.position.y = 0.72;
      const head = part(new CylinderGeometry(0.16, 0.16, 0.5, 8), CHROME);
      head.rotation.z = Math.PI / 2;
      head.position.set(0.6, 0.55, 0);
      const gauge = part(new CylinderGeometry(0.12, 0.12, 0.04, 10), TOKENS.paper);
      gauge.rotation.z = Math.PI / 2;
      gauge.position.set(0.42, 0.85, 0);
      const needle = part(new BoxGeometry(0.02, 0.1, 0.015), TOKENS.cherry);
      needle.position.set(0.45, 0.88, 0);
      needle.rotation.x = 0.6;
      const wand = part(new CylinderGeometry(0.02, 0.02, 0.5, 5), CHROME);
      wand.position.set(0.3, 0.45, 0.42);
      wand.rotation.x = 0.5;
      const tray = part(new BoxGeometry(0.9, 0.06, 0.75), CHROME);
      tray.position.y = 0.03;
      g.add(body, trimBand, head, gauge, needle, wand, tray);
      break;
    }
    case 'aeropress': {
      const outer = part(new CylinderGeometry(0.16, 0.16, 1.2, 8), TOKENS.ink);
      outer.rotation.z = Math.PI / 2 - 0.15;
      outer.position.set(0.1, 0.75, 0);
      const inner = part(new CylinderGeometry(0.12, 0.12, 0.6, 8), CHROME);
      inner.rotation.z = Math.PI / 2 - 0.15;
      inner.position.set(-0.7, 0.63, 0);
      const cap = part(new CylinderGeometry(0.2, 0.2, 0.06, 8), accentHex);
      cap.rotation.z = Math.PI / 2 - 0.15;
      cap.position.set(0.72, 0.84, 0);
      const scope = part(new CylinderGeometry(0.05, 0.05, 0.3, 6), CHROME);
      scope.rotation.z = Math.PI / 2 - 0.15;
      scope.position.set(0.1, 0.98, 0);
      g.add(outer, inner, cap, scope);
      const legGeo = paint(new CylinderGeometry(0.02, 0.02, 0.9, 4), WOOD);
      for (const [dx, dz] of [
        [0.25, 0],
        [-0.15, 0.2],
        [-0.15, -0.2],
      ] as const) {
        const leg = new Mesh(legGeo, opaque);
        leg.position.set(dx * 0.5, 0.42, dz * 0.5);
        leg.rotation.x = -dz * 1.1;
        leg.rotation.z = dx * 1.1;
        leg.castShadow = true;
        g.add(leg);
      }
      break;
    }
  }
  return g;
}
