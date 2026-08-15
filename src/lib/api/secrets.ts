/**
 * Constant-time string compare for shared secrets (force-sync, proxy bearer).
 * Length is still observable; values of equal length are compared without
 * short-circuiting on the first mismatch.
 */
export function secretsEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const len = Math.max(a.byteLength, b.byteLength, 1);
  const xa = new Uint8Array(len);
  const xb = new Uint8Array(len);
  xa.set(a);
  xb.set(b);
  let mismatch = a.byteLength === b.byteLength ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= xa[i] ^ xb[i];
  }
  return mismatch === 0;
}
