export interface Frame {
  /** seconds since the previous frame, clamped to 0.1 */
  dt: number;
  /** exponential moving average of frame time in ms */
  emaMs: number;
  now: number;
}

export type FrameHandler = (frame: Frame) => void;

/** rAF loop with a frame-time EMA. Pauses when the tab is hidden. */
export function startClock(onFrame: FrameHandler): () => void {
  let last = performance.now();
  let emaMs = 16.7;
  let handle = 0;
  let running = true;

  const tick = (now: number): void => {
    if (!running) return;
    const rawMs = now - last;
    last = now;
    emaMs = emaMs * 0.9 + rawMs * 0.1;
    onFrame({ dt: Math.min(rawMs / 1000, 0.1), emaMs, now });
    handle = requestAnimationFrame(tick);
  };

  const onVisibility = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(handle);
    } else {
      last = performance.now();
      handle = requestAnimationFrame(tick);
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  handle = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(handle);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
