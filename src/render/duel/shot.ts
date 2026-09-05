import { Group, Mesh, RingGeometry, SphereGeometry } from 'three';
import type { Scene } from 'three';
import { opaque, paint } from '../materials';
import { TOKENS } from '../tokens';
import { DT } from '../../sim/rules';
import type { Impact, ShotResult } from '../../sim/types';

const AMMO_HEX: Record<string, number> = {
  green: TOKENS.roast.green,
  dark: 0x3a2115,
  ground: 0x5c3a22,
  cup: TOKENS.paper,
};
const TRAIL_INTERVAL_S = 0.06; // dots at fixed time, so they bunch at apex (UX.md §5.2)
const MAX_PLAY_S = 2.5;

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

function dotMesh(hex: number, r: number): Mesh {
  return new Mesh(paint(new SphereGeometry(r, 5, 4), hex), opaque);
}

export function createShotLayer(scene: Scene): ShotLayer {
  const ghost = new Group();
  const preview = new Group();
  const markers = new Group();
  scene.add(ghost, preview, markers);

  const layDots = (
    group: Group,
    traj: Float64Array,
    hex: number,
    r: number,
    everyS: number,
    fraction: number,
  ): void => {
    group.clear();
    const steps = traj.length / 2;
    const upto = Math.max(1, Math.floor(steps * fraction));
    const every = Math.max(1, Math.round(everyS / DT));
    for (let i = 0; i < upto; i += every) {
      const x = traj[i * 2];
      const y = traj[i * 2 + 1];
      if (x === undefined || y === undefined) continue;
      const d = dotMesh(hex, r);
      d.position.set(x, y, 0.3);
      group.add(d);
    }
  };

  return {
    play(result, ammo, onImpact) {
      const projectiles = result.trajectories.map((traj) => {
        const m = dotMesh(AMMO_HEX[ammo] ?? TOKENS.roast.green, ammo === 'cup' ? 0.3 : 0.18);
        m.castShadow = true;
        scene.add(m);
        return { traj, mesh: m, trail: new Group(), lastTrail: 0, steps: traj.length / 2 };
      });
      for (const p of projectiles) scene.add(p.trail);
      const longest = Math.max(...projectiles.map((p) => p.steps));
      const rate = Math.max(120, longest / MAX_PLAY_S); // steps per second, ≤2.5s total
      let t = 0;
      let done = false;
      let impacted = false;
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
            // scale up toward apex so the shot never vanishes at the top of the frame
            const apexT = apexY > 0.5 ? Math.max(0, Math.min(1, y / apexY)) : 0;
            const sc = 1 + 0.4 * apexT;
            p.mesh.scale.setScalar(sc);
            if (t - p.lastTrail >= TRAIL_INTERVAL_S && s < p.steps - 1) {
              p.lastTrail = t;
              const d = dotMesh(AMMO_HEX[ammo] ?? TOKENS.roast.green, 0.07);
              d.position.set(x, y, 0.2);
              p.trail.add(d);
            }
            if (s < p.steps - 1) allDone = false;
          }
          if (allDone && !impacted) {
            impacted = true;
            for (const p of projectiles) p.mesh.visible = false;
            for (const im of result.impacts) onImpact(im);
            done = true;
            // the trail of the primary becomes the ghost for one turn
            const primary = projectiles[0];
            if (primary !== undefined) {
              ghost.clear();
              layDots(ghost, primary.traj, TOKENS.ink, 0.06, TRAIL_INTERVAL_S, 1);
              ghost.children.forEach((c) => {
                c.position.z = 0.1;
              });
            }
          }
          return done;
        },
        dispose() {
          for (const p of projectiles) {
            scene.remove(p.mesh);
            scene.remove(p.trail);
          }
        },
      };
    },
    setGhost(traj) {
      ghost.clear();
      if (traj !== null) layDots(ghost, traj, TOKENS.ink, 0.06, TRAIL_INTERVAL_S, 1);
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
        const d = dotMesh(TOKENS.ink, 0.09);
        d.position.set(x, y, 0.35);
        preview.add(d);
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
      const ring = new Mesh(paint(new RingGeometry(0.28, 0.42, 12), hex), opaque);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(impact.x, impact.y + 0.03, 0);
      markers.add(ring);
      // newest marker is filled (UX.md deviation 11)
      for (const c of markers.children) c.scale.setScalar(1);
      const disc = new Mesh(paint(new RingGeometry(0.02, 0.26, 12), hex), opaque);
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(ring.position);
      disc.name = 'fill';
      const old = markers.getObjectByName('fill');
      if (old !== undefined) markers.remove(old);
      markers.add(disc);
    },
    clearMarkers() {
      markers.clear();
    },
  };
}
