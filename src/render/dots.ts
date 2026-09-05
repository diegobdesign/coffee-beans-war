import {
  Color,
  InstancedMesh,
  Matrix4,
  Object3D,
  SphereGeometry,
  SRGBColorSpace,
  type Scene,
} from 'three';
import { opaque, paint } from './materials';

const scratch = new Object3D();
const color = new Color();
const hidden = new Matrix4().makeScale(0, 0, 0);

/** A pool of dots as one InstancedMesh: one draw call for trails, previews, markers (ARCHITECTURE §2.3). */
export class DotPool {
  readonly mesh: InstancedMesh;
  private used = 0;

  constructor(scene: Scene, capacity: number, radius: number, hex: number) {
    const geo = paint(new SphereGeometry(radius, 5, 4), hex);
    this.mesh = new InstancedMesh(geo, opaque, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.clear();
    scene.add(this.mesh);
  }

  get count(): number {
    return this.used;
  }

  clear(): void {
    for (let i = 0; i < this.mesh.count; i++) this.mesh.setMatrixAt(i, hidden);
    this.used = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** returns false when the pool is full */
  push(x: number, y: number, z: number, scale = 1, hex?: number): boolean {
    if (this.used >= this.mesh.count) return false;
    scratch.position.set(x, y, z);
    scratch.scale.setScalar(scale);
    scratch.updateMatrix();
    this.mesh.setMatrixAt(this.used, scratch.matrix);
    if (hex !== undefined) {
      color.setHex(hex, SRGBColorSpace);
      this.mesh.setColorAt(this.used, color);
      if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
    }
    this.used += 1;
    this.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  set(i: number, x: number, y: number, z: number, scale = 1): void {
    if (i >= this.mesh.count) return;
    scratch.position.set(x, y, z);
    scratch.scale.setScalar(scale);
    scratch.updateMatrix();
    this.mesh.setMatrixAt(i, scratch.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.used = Math.max(this.used, i + 1);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.dispose();
  }
}
