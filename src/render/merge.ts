import { Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Collapse every Mesh under `root` that uses `material` into ONE mesh (ARCHITECTURE §2.3: merge
 * everything that shares a material). World transforms are baked in. Attributes are normalised to
 * position / normal / color, non-indexed, so flat shading survives the merge.
 */
export function mergeByMaterial(root: Object3D, material: Material): Mesh | null {
  root.updateMatrixWorld(true);
  const parts: BufferGeometry[] = [];
  root.traverse((o) => {
    if (!(o instanceof Mesh) || o.material !== material) return;
    let g = o.geometry as BufferGeometry;
    if (g.index !== null) g = g.toNonIndexed();
    else g = g.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
    }
    if (!g.hasAttribute('normal')) g.computeVertexNormals();
    if (!g.hasAttribute('color')) return;
    g.applyMatrix4(o.matrixWorld);
    parts.push(g);
  });
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  const mesh = new Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function triangleCount(root: Object3D): number {
  let tris = 0;
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry as BufferGeometry;
    const count = g.index !== null ? g.index.count : g.getAttribute('position').count;
    const inst =
      'isInstancedMesh' in o && (o as { count?: number }).count !== undefined
        ? (o as { count: number }).count
        : 1;
    tris += (count / 3) * inst;
  });
  return Math.round(tris);
}

export function drawableCount(root: Object3D): number {
  let n = 0;
  root.traverse((o) => {
    if (o instanceof Mesh && o.visible) n += 1;
  });
  return n;
}
