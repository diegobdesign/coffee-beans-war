import { CylinderGeometry, Group, Mesh, SphereGeometry } from 'three';
import { opaque, paint } from '../render/materials';
import { TOKENS } from '../render/tokens';

/** Coffee tree: short trunk plus three stacked flattened spheres (rounded canopy, never cones), cherries as dots. */
export function createTree(height: number, canopyR: number): Group {
  const g = new Group();
  const trunk = new Mesh(paint(new CylinderGeometry(0.12, 0.16, height, 6), TOKENS.trunk), opaque);
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const layers: [number, number, number][] = [
    [0, height - 0.2, canopyR],
    [0.2, height + 0.5, canopyR * 0.85],
    [-0.1, height + 1.0, canopyR * 0.6],
  ];
  for (const [dx, y, r] of layers) {
    const c = new Mesh(paint(new SphereGeometry(r, 7, 5), TOKENS.canopyLight), opaque);
    c.scale.y = 0.7;
    c.position.set(dx, y, 0);
    c.castShadow = true;
    g.add(c);
  }
  const cherryGeo = paint(new SphereGeometry(0.05, 4, 3), TOKENS.cherry);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ch = new Mesh(cherryGeo, opaque);
    ch.position.set(
      Math.cos(a) * canopyR * 0.8,
      height + 0.1 + (i % 3) * 0.35,
      Math.sin(a) * canopyR * 0.55 + 0.3,
    );
    g.add(ch);
  }
  return g;
}
