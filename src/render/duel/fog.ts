import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Scene,
} from 'three';

export const FOG_LAYER = 1;
const TEX = 512;
const X0 = 13;
const X1 = 31;
const Y0 = -6;
const Y1 = 16;

export interface FogVeil {
  /** punch a hole of world radius r at world (x, y); permanent for the duel */
  revealAt(x: number, y: number, r: number): void;
  /** 0 = full veil, 1 = lifted */
  setLift(t: number): void;
  dispose(): void;
}

/**
 * The opponent's half of the stage hidden in steam (GAME-DESIGN §2b). A canvas-painted veil in
 * front of their side; impacts thin it in a radius so the opponent emerges from the player's own shots.
 * Presentation only: the impact list is the truth, this is a fold over it.
 */
export function createFogVeil(scene: Scene): FogVeil {
  const canvas = document.createElement('canvas');
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('fog canvas');

  const paintBase = (): void => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.fillStyle = 'rgba(231, 211, 180, 0.97)'; // sky-horizon, latte
    ctx.fillRect(0, 0, TEX, TEX);
    // soft steam blobs, seeded by position so the veil reads as weather, not a rectangle
    for (let i = 0; i < 26; i++) {
      const cx = ((i * 97) % TEX) + ((i * 31) % 40);
      const cy = ((i * 61) % TEX) + ((i * 17) % 40);
      const r = 60 + ((i * 23) % 70);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // a soft left edge so the veil starts mid-stage as drifting steam rather than a wall
    const edge = ctx.createLinearGradient(0, 0, TEX * 0.16, 0);
    edge.addColorStop(0, 'rgba(0,0,0,1)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, TEX * 0.16, TEX);
    // and a soft top so the steam thins into the sky instead of ending on a line
    const top = ctx.createLinearGradient(0, 0, 0, TEX * 0.3);
    top.addColorStop(0, 'rgba(0,0,0,1)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, TEX, TEX * 0.3);
    ctx.globalCompositeOperation = 'source-over';
  };
  paintBase();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new Mesh(new PlaneGeometry(X1 - X0, Y1 - Y0), material);
  mesh.position.set((X0 + X1) / 2, (Y0 + Y1) / 2, 2.6);
  mesh.layers.set(FOG_LAYER);
  mesh.renderOrder = 10;
  scene.add(mesh);

  const toTex = (x: number, y: number): [number, number] => [
    ((x - X0) / (X1 - X0)) * TEX,
    (1 - (y - Y0) / (Y1 - Y0)) * TEX,
  ];
  const toTexR = (r: number): number => (r / (X1 - X0)) * TEX;

  return {
    revealAt(x, y, r) {
      const [tx, ty] = toTex(x, y);
      const tr = toTexR(r);
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, tr);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g;
      ctx.fillRect(tx - tr, ty - tr, tr * 2, tr * 2);
      ctx.globalCompositeOperation = 'source-over';
      texture.needsUpdate = true;
    },
    setLift(t) {
      material.opacity = 1 - Math.max(0, Math.min(1, t));
      mesh.visible = material.opacity > 0.01;
    },
    dispose() {
      scene.remove(mesh);
      texture.dispose();
      material.dispose();
      mesh.geometry.dispose();
    },
  };
}
