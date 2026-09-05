/** int32 checksum over quantised outcome values. FNV-1a over a stream of int32s. */
export function hashInts(values: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const v of values) {
    const n = v | 0;
    h ^= n & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (n >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (n >>> 16) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (n >>> 24) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** quantise a stage coordinate to 1e-4 before hashing */
export function q4(x: number): number {
  return Math.round(x * 10000);
}
