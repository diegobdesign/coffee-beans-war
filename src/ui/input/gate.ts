/** One place decides whether an input counts (ARCHITECTURE.md §11.5). Timestamp compare, no timers. */
export interface InputGate {
  accept(e?: Event): boolean;
  lockFor(ms: number): void;
  mounted(): void;
}

export function createGate(): InputGate {
  let lockedUntil = 0;
  let mountTime = performance.now();
  return {
    accept(e) {
      const now = performance.now();
      if (now < lockedUntil) return false;
      if (e !== undefined && e.timeStamp < mountTime) return false;
      return true;
    },
    lockFor(ms) {
      lockedUntil = Math.max(lockedUntil, performance.now() + ms);
    },
    mounted() {
      mountTime = performance.now();
    },
  };
}
