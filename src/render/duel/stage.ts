import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { createTree } from '../../assets/tree';
import { flood as floodMat, opaque, paint } from '../materials';
import { mergeByMaterial } from '../merge';
import { TOKENS } from '../tokens';
import { SAMPLE_SPACING, type Stage } from '../../sim/terrain';
import { STAGE_WIDTH } from '../../sim/rules';
import type { DuelSetup } from '../../sim/types';

const DEPTH = 6; // stage ribbon from z = -DEPTH/2 (far) to +DEPTH/2 (near)
const FRONT_DROP = 40; // the front face runs off the bottom of any viewport

/**
 * The duel stage geometry, built from the sim's height profile so what you see is what the shot hits.
 * Top ribbon + front face, flat shaded, vertex coloured by biome: rock near a mountain bean,
 * soil elsewhere, water plane over the flood platform.
 */
export function buildStage(setup: DuelSetup, stage: Stage): Group {
  const g = new Group();
  const n = stage.heights.length;
  const near = DEPTH / 2;
  const far = -DEPTH / 2;
  const positions: number[] = [];
  const colors: number[] = [];
  const rock = new Color().setHex(TOKENS.rock, SRGBColorSpace);
  const rockLit = new Color().setHex(TOKENS.rockLit, SRGBColorSpace);
  const soil = new Color().setHex(TOKENS.soil, SRGBColorSpace);
  const canopyDark = new Color().setHex(TOKENS.canopyDark, SRGBColorSpace);

  const biome = (x: number): Color => {
    for (const s of [0, 1] as const) {
      const d = Math.abs(x - stage.beanX[s]);
      const st = setup.sides[s].stance;
      if (st === 'mountain' && d <= 4.5) return d <= 1.5 ? rockLit : rock;
      if (st === 'tree' && d <= 2.5) return canopyDark;
    }
    return soil;
  };

  const push = (x: number, y: number, z: number, c: Color): void => {
    positions.push(x, y, z);
    colors.push(c.r, c.g, c.b);
  };

  for (let i = 0; i < n - 1; i++) {
    const x0 = i * SAMPLE_SPACING;
    const x1 = (i + 1) * SAMPLE_SPACING;
    const h0 = stage.heights[i] ?? 0;
    const h1 = stage.heights[i + 1] ?? 0;
    const c = biome((x0 + x1) / 2);
    // top quad (two triangles), counter-clockwise seen from above
    push(x0, h0, far, c);
    push(x0, h0, near, c);
    push(x1, h1, near, c);
    push(x0, h0, far, c);
    push(x1, h1, near, c);
    push(x1, h1, far, c);
    // front face, slightly darker
    const cf = c.clone().multiplyScalar(0.82);
    push(x0, h0, near, cf);
    push(x0, -FRONT_DROP, near, cf);
    push(x1, -FRONT_DROP, near, cf);
    push(x0, h0, near, cf);
    push(x1, -FRONT_DROP, near, cf);
    push(x1, h1, near, cf);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geo.computeVertexNormals();
  const terrain = new Mesh(geo, opaque);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  g.add(terrain);

  // water over a flood platform, with a crema foam edge
  for (const s of [0, 1] as const) {
    if (setup.sides[s].stance !== 'flood') continue;
    const bx = stage.beanX[s];
    const w = 9;
    const water = new Mesh(paint(new PlaneGeometry(w, DEPTH), TOKENS.flood), floodMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(bx, 0.03, 0);
    water.receiveShadow = true;
    g.add(water);
    for (const edge of [-1, 1]) {
      const foam = new Mesh(paint(new BoxGeometry(0.12, 0.04, DEPTH), TOKENS.crema), opaque);
      foam.position.set(bx + (edge * w) / 2, 0.05, 0);
      g.add(foam);
    }
    // stilt platform of stirrers under the bean
    const deck = new Mesh(paint(new BoxGeometry(2.2, 0.08, 1.4), TOKENS.trunk), opaque);
    deck.position.set(bx, 0.08, 0);
    deck.castShadow = true;
    g.add(deck);
    for (const dx of [-0.9, 0.9]) {
      for (const dz of [-0.5, 0.5]) {
        const stilt = new Mesh(paint(new BoxGeometry(0.08, 0.6, 0.08), TOKENS.trunk), opaque);
        stilt.position.set(bx + dx, -0.2, dz);
        g.add(stilt);
      }
    }
  }

  // tree behind a tree-stance bean, canopy matching the sim obstacle circle
  for (const c of stage.canopies) {
    const tree = createTree(stage.beanY[c.side] + 1.0, c.r);
    tree.position.set(c.x, 0, -0.9);
    g.add(tree);
  }

  // far bands: fogged ridge silhouettes (ART-DIRECTION §2: mid band ~55%, far band ~85%)
  const ridge = (z: number, hex: number, peaks: readonly (readonly [number, number])[]): void => {
    const pts: number[] = [];
    const cols: number[] = [];
    const col = new Color().setHex(hex, SRGBColorSpace);
    for (let i = 0; i < peaks.length - 1; i++) {
      const a = peaks[i];
      const b = peaks[i + 1];
      if (a === undefined || b === undefined) continue;
      pts.push(a[0], -3, z, b[0], -3, z, b[0], b[1], z, a[0], -3, z, b[0], b[1], z, a[0], a[1], z);
      for (let k = 0; k < 6; k++) cols.push(col.r, col.g, col.b);
    }
    const rg = new BufferGeometry();
    rg.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    rg.setAttribute('color', new BufferAttribute(new Float32Array(cols), 3));
    rg.computeVertexNormals();
    const m = new Mesh(rg, opaque);
    g.add(m);
  };
  ridge(-22, TOKENS.canopyDark, [
    [-20, 2],
    [-8, 6],
    [2, 3],
    [10, 7],
    [18, 4],
    [26, 8],
    [36, 3],
    [48, 5],
  ]);
  ridge(-45, TOKENS.rock, [
    [-30, 6],
    [-10, 14],
    [4, 9],
    [16, 16],
    [30, 10],
    [44, 15],
    [60, 7],
  ]);

  // stage edge markers so off-stage reads as off-stage
  const edge = new Mesh(paint(new BoxGeometry(0.05, 0.05, DEPTH), TOKENS.crema), opaque);
  edge.position.set(STAGE_WIDTH, 0.02, 0);
  g.add(edge.clone());
  edge.position.x = 0;
  g.add(edge);

  // one draw call for every opaque part of the stage, one for the water (ARCHITECTURE §2.3)
  const out = new Group();
  const merged = mergeByMaterial(g, opaque);
  if (merged !== null) out.add(merged);
  const water = mergeByMaterial(g, floodMat);
  if (water !== null) {
    water.castShadow = false;
    out.add(water);
  }
  return out;
}
