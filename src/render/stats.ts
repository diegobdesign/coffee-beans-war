import type { WebGLRenderer } from 'three';

/** The ?stats=1 overlay (ARCHITECTURE §2.8). Ships in production; ~2KB. Paper chip styling. */
export interface Stats {
  frame(ms: number, extra: { level: number; dpr: number; simMs?: number }): void;
  dispose(): void;
}

export function createStats(app: HTMLElement, renderer: WebGLRenderer): Stats {
  const el = document.createElement('pre');
  el.className = 'chip chip--stats';
  el.setAttribute('aria-hidden', 'true');
  app.append(el);
  const window300: number[] = [];
  let lastPaint = 0;
  let worst = 0;
  return {
    frame(ms, extra) {
      window300.push(ms);
      if (window300.length > 300) window300.shift();
      worst = Math.max(worst, ms);
      if (performance.now() - lastPaint < 250) return;
      lastPaint = performance.now();
      const sorted = [...window300].sort((a, b) => a - b);
      const q = (p: number): number =>
        sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
      const info = renderer.info;
      el.textContent =
        `FRAME ${q(0.5).toFixed(1)}ms  p95 ${q(0.95).toFixed(1)}  p99 ${q(0.99).toFixed(1)}  max ${worst.toFixed(0)}\n` +
        `DPR ${extra.dpr.toFixed(2)}  L${String(extra.level)}\n` +
        `CALLS ${String(info.render.calls)}  TRIS ${info.render.triangles.toLocaleString()}\n` +
        `PROG ${String(info.programs?.length ?? 0)}  GEO ${String(info.memory.geometries)}  TEX ${String(info.memory.textures)}` +
        (extra.simMs !== undefined ? `\nSIM ${extra.simMs.toFixed(2)}ms` : '');
    },
    dispose() {
      el.remove();
    },
  };
}
