import {
  BufferAttribute,
  type BufferGeometry,
  Color,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SRGBColorSpace,
} from 'three';

/** The five materials of ARCHITECTURE §2.2, created exactly once. */
export const opaque = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
export const glass = new MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
  transparent: true,
  opacity: 0.35,
  depthWrite: true,
});
export const veil = new MeshBasicMaterial({
  transparent: true,
  depthWrite: false,
  vertexColors: true,
});
export const flood = new MeshLambertMaterial({ vertexColors: true, flatShading: true });

const scratch = new Color();

/** Paint every vertex of a geometry one sRGB token, converted to the linear working space (ARCHITECTURE §2.2). */
export function paint(geo: BufferGeometry, hex: number, alpha = 1): BufferGeometry {
  scratch.setHex(hex, SRGBColorSpace);
  const count = geo.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  if (alpha < 1) {
    const a = new Float32Array(count).fill(alpha);
    geo.setAttribute('alpha', new BufferAttribute(a, 1));
  }
  return geo;
}

export function linear(hex: number): Color {
  return new Color().setHex(hex, SRGBColorSpace);
}
