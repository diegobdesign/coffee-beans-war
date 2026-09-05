import { Mesh, RingGeometry, SphereGeometry } from 'three';
import type { Scene } from 'three';
import { DT } from '../../sim/rules';
import type { Impact, ShotResult } from '../../sim/types';
import { DotPool } from '../dots';
import { opaque, paint } from '../materials';
import { TOKENS } from '../tokens';

const AMMO_HEX: Record<string, number> = {
  green: TOKENS.roast.green,
  dark: 0x3a2115,
  ground: 0x5c3a22,
  cup: TOKENS.paper,
};
const TRAIL_INTERVAL_S = 0.06; // dots at fixed time, so they bunch at apex (UX.md §5.2)
const MAX_PLAY_S = 2.5;
const MARKER_CAP = 128;

export interface ShotPlayback {
  /** advance by dt seconds; returns true when finished */
  update(dt: number): boolean;
  dispose(): void;
}

export interface ShotLayer {
  play(result: ShotResult, ammo: string, onImpact: (impact: Impact) => void): ShotPlayback;
  /** the previous shot's trail, kept for exactly one turn */
  setGhost(trajectory: Float64Array | null): void;
  setPreview(points: Float64Array | null): void;
  addMarker(impact: Impact): void;
  clearMarkers(): void;
}

/**
 * Every dot in the duel is an instance in one of four pools: preview (1 draw), ghost (1), trails (1),
 * markers (1) plus one filled disc for the newest marker. Projectiles are ≤ 6 small meshes.
 */
export function createShotLayer(scene: Scene): ShotLayer {
  const preview = new DotPool(scene, 8, 0.09, TOKENS.ink);
  const ghost = new DotPool(scene, 64, 0.06, TOKENS.ink);
  const trails = new DotPool(scene, 512, 0.07, TOKENS.roast.green);
  const markers = new DotPool(scene, MARKER_CAP, 0.36, TOKENS.soil);
  markers.mesh.geometry.dispose();
  markers.mesh.geometry = paint(new RingGeometry(0.28, 0.42, 12), TOKENS.soil);
  markers.mesh.geometry.rotateX(-Math.PI / 2);
  const fill = new Mesh(paint(new RingGeometry(0.02, 0.26, 12), TOKENS.soil), opaque);
  fill.rotation.x = -Math.PI / 2;
  fill.visible = false;
  scene.add(fill);

  const layGhost = (traj: Float64Array): void => {
    ghost.clear();
    const steps = traj.length / 2;
    const every = Math.max(1, Math.round(TRAIL_INTERVAL_S / DT));
    for (let i = 0; i < steps; i += every) {
      const x = traj[i * 2];
      const y = traj[i * 2 + 1];
      if (x === undefined || y === undefined) continue;
      if (!ghost.push(x, y, 0.1)) break;
    }
  };

  return {
    play(result, ammo, onImpact) {
      const hex = AMMO_HEX[ammo] ?? TOKENS.roast.green;
      const projectiles = result.trajectories.map((traj) => {
        const m = new Mesh(
          paint(new SphereGeometry(ammo === 'cup' ? 0.3 : 0.18, 5, 4), hex),
          opaque,
        );
        m.castShadow = true;
        scene.add(m);
        return { traj, mesh: m, lastTrail: 0, steps: traj.length / 2 };
      });
      trails.clear();
      const longest = Math.max(...projectiles.map((p) => p.steps));
      const rate = Math.max(120, longest / MAX_PLAY_S);
      let t = 0;
      let done = false;
      let apexY = -Infinity;
      for (const p of projectiles)
        for (let i = 1; i < p.traj.length; i += 2) apexY = Math.max(apexY, p.traj[i] ?? 0);
      return {
        update(dt) {
          if (done) return true;
          t += dt;
          const step = t * rate;
          let allDone = true;
          for (const p of projectiles) {
            const s = Math.min(p.steps - 1, step);
            const i0 = Math.floor(s);
            const i1 = Math.min(p.steps - 1, i0 + 1);
            const f = s - i0;
            const x0 = p.traj[i0 * 2] ?? 0;
            const y0 = p.traj[i0 * 2 + 1] ?? 0;
            const x1 = p.traj[i1 * 2] ?? x0;
            const y1 = p.traj[i1 * 2 + 1] ?? y0;
            const x = x0 + (x1 - x0) * f;
            const y = y0 + (y1 - y0) * f;
            p.mesh.position.set(x, y, 0.25);
            p.mesh.rotation.x += dt * 9;
            p.mesh.rotation.z += dt * 5;
            const apexT = apexY > 0.5 ? Math.max(0, Math.min(1, y / apexY)) : 0;
            p.mesh.scale.setScalar(1 + 0.4 * apexT);
            if (t - p.lastTrail >= TRAIL_INTERVAL_S && s < p.steps - 1) {
              p.lastTrail = t;
              trails.push(x, y, 0.2, 1, hex);
            }
            if (s < p.steps - 1) allDone = false;
          }
          if (allDone) {
            for (const p of projectiles) p.mesh.visible = false;
            for (const im of result.impacts) onImpact(im);
            done = true;
            const primary = projectiles[0];
            if (primary !== undefined) layGhost(primary.traj);
          }
          return done;
        },
        dispose() {
          for (const p of projectiles) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
          }
        },
      };
    },
    setGhost(traj) {
      if (traj === null) ghost.clear();
      else layGhost(traj);
    },
    setPreview(points) {
      preview.clear();
      if (points === null) return;
      // 8 dots over the first 30% (ART-DIRECTION §9)
      const steps = points.length / 2;
      const upto = Math.max(2, Math.floor(steps * 0.3));
      for (let k = 0; k < 8; k++) {
        const i = Math.min(upto - 1, Math.round((k / 7) * (upto - 1)));
        const x = points[i * 2];
        const y = points[i * 2 + 1];
        if (x === undefined || y === undefined) continue;
        preview.push(x, y, 0.35);
      }
    },
    addMarker(impact) {
      if (impact.kind === 'offstage') return;
      const hex =
        impact.kind === 'splash'
          ? TOKENS.crema
          : impact.kind === 'leaf'
            ? TOKENS.canopyDark
            : TOKENS.soil;
      markers.push(impact.x, impact.y + 0.03, 0, 1, hex);
      // newest marker is filled (UX.md deviation 11)
      fill.position.set(impact.x, impact.y + 0.03, 0);
      fill.visible = true;
    },
    clearMarkers() {
      markers.clear();
      fill.visible = false;
    },
  };
}
