import {
  angleDeciDegFromDrag,
  dragRadius,
  inDeadZone,
  originBand,
  powerPerMilleFromDrag,
} from './aim-math';
import { DRAG_DEAD_ZONE_PX, MIN_DRAG_MS, POWER_FLOOR_PER_MILLE } from './constants';

export interface Aim {
  readonly angleDd: number;
  readonly powerPm: number;
}

export interface AimHandlers {
  onArm(): void;
  /** called at most once per frame, from flush() */
  onAim(a: Aim): void;
  onCancel(): void;
  onFire(a: Aim): void;
}

export interface AimGesture {
  /** call from the single rAF */
  flush(): void;
  cancel(): void;
  dispose(): void;
}

/**
 * Anchor-relative direct drag (UX.md §3.1 to §3.5, §3.7.4). One exit path: endGesture(committed).
 * pointercancel and lostpointercapture are cancels, never fires. No blanket preventDefault.
 */
export function createAimGesture(
  layer: HTMLElement,
  handlers: AimHandlers,
  enabled: () => boolean,
): AimGesture {
  let pointerId: number | null = null;
  let anchorX = 0;
  let anchorY = 0;
  let t0 = 0;
  let armed = false;
  let pending: Aim | null = null;
  let last: Aim | null = null;
  let lastX = 0;
  let lastY = 0;

  const aimFrom = (x: number, y: number): Aim => {
    const dx = x - anchorX;
    const dy = y - anchorY;
    const R = dragRadius(window.innerWidth, window.innerHeight);
    return {
      angleDd: angleDeciDegFromDrag(dx, dy),
      powerPm: powerPerMilleFromDrag(Math.sqrt(dx * dx + dy * dy), R),
    };
  };

  const reset = (): void => {
    if (pointerId !== null) {
      try {
        layer.releasePointerCapture(pointerId);
      } catch {
        // capture may already be gone
      }
    }
    pointerId = null;
    armed = false;
    pending = null;
    last = null;
  };

  const overHud = (x: number, y: number): boolean => {
    const el = document.elementFromPoint(x, y);
    return el !== null && el.closest('.hud-block, .chip') !== null;
  };

  const endGesture = (committed: boolean, e?: PointerEvent): void => {
    const wasArmed = armed;
    const aim = last;
    const elapsed = e !== undefined ? e.timeStamp - t0 : 0;
    const x = e?.clientX ?? lastX;
    const y = e?.clientY ?? lastY;
    reset();
    if (!wasArmed) return;
    if (
      committed &&
      aim !== null &&
      elapsed >= MIN_DRAG_MS &&
      aim.powerPm >= POWER_FLOOR_PER_MILLE &&
      !overHud(x, y) &&
      !inDeadZone(y, window.innerHeight)
    ) {
      handlers.onFire(aim);
    } else {
      handlers.onCancel();
    }
  };

  const onDown = (e: PointerEvent): void => {
    if (!enabled()) return;
    if (e.button !== 0) return;
    if (pointerId !== null) {
      // a second finger cancels (UX.md §3.3 guard 6)
      endGesture(false);
      return;
    }
    const band = originBand(window.innerWidth, window.innerHeight);
    if (e.clientY < band.top || e.clientY > band.bottom) return;
    if (overHud(e.clientX, e.clientY)) return;
    pointerId = e.pointerId;
    anchorX = e.clientX;
    anchorY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    t0 = e.timeStamp;
    armed = false;
    layer.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onMove = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    const pts = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const p = pts.length > 0 ? pts[pts.length - 1] : e;
    if (p === undefined) return;
    lastX = p.clientX;
    lastY = p.clientY;
    const dx = p.clientX - anchorX;
    const dy = p.clientY - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!armed) {
      if (dist < DRAG_DEAD_ZONE_PX) return;
      armed = true;
      handlers.onArm();
    } else if (dist < DRAG_DEAD_ZONE_PX) {
      // return-to-origin cancels (guard 4)
      endGesture(false);
      return;
    }
    const a = aimFrom(p.clientX, p.clientY);
    pending = a;
    last = a;
    e.preventDefault();
  };

  const onUp = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    endGesture(true, e);
  };
  const onCancelEvt = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    endGesture(false, e);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && pointerId !== null) endGesture(false);
  };
  const onContext = (e: Event): void => {
    if (pointerId !== null) {
      e.preventDefault();
      endGesture(false);
    }
  };
  const onViewport = (): void => {
    if (pointerId !== null) endGesture(false);
  };

  layer.addEventListener('pointerdown', onDown);
  layer.addEventListener('pointermove', onMove);
  layer.addEventListener('pointerup', onUp);
  layer.addEventListener('pointercancel', onCancelEvt);
  layer.addEventListener('lostpointercapture', onCancelEvt);
  layer.addEventListener('contextmenu', onContext);
  window.addEventListener('keydown', onKey);
  window.visualViewport?.addEventListener('resize', onViewport);
  window.addEventListener('orientationchange', onViewport);

  return {
    flush() {
      if (pending === null) return;
      const a = pending;
      pending = null;
      handlers.onAim(a);
    },
    cancel() {
      if (pointerId !== null) endGesture(false);
    },
    dispose() {
      layer.removeEventListener('pointerdown', onDown);
      layer.removeEventListener('pointermove', onMove);
      layer.removeEventListener('pointerup', onUp);
      layer.removeEventListener('pointercancel', onCancelEvt);
      layer.removeEventListener('lostpointercapture', onCancelEvt);
      layer.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKey);
      window.visualViewport?.removeEventListener('resize', onViewport);
      window.removeEventListener('orientationchange', onViewport);
      reset();
    },
  };
}
