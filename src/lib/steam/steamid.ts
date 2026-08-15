/**
 * SteamID64 validation for public individual accounts.
 *
 * Layout: universe (8) | type (4) | instance (20) | account (32)
 * Public individual: universe=1, type=1 (Individual), instance=0 or 1.
 */

const STEAM_ID64_DIGITS = /^\d{17}$/;
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TYPE_MASK = BigInt(15);
const INSTANCE_MASK = BigInt(0xfffff);
const SHIFT_UNIVERSE = BigInt(56);
const SHIFT_TYPE = BigInt(52);
const SHIFT_INSTANCE = BigInt(32);

export const STEAM_ID64_MIN = BigInt("76561197960265728"); // 0x0110000100000000
export const STEAM_ID64_MAX = BigInt("76561202255233023"); // universe=1 type=1 instance=1 account=2^32-1

export function isSteamId64(value: string): boolean {
  const trimmed = value.trim();
  if (!STEAM_ID64_DIGITS.test(trimmed)) return false;
  try {
    const n = BigInt(trimmed);
    if (n < STEAM_ID64_MIN || n > STEAM_ID64_MAX) return false;
    const universe = n >> SHIFT_UNIVERSE;
    const accountType = (n >> SHIFT_TYPE) & TYPE_MASK;
    const instance = (n >> SHIFT_INSTANCE) & INSTANCE_MASK;
    return universe === ONE && accountType === ONE && (instance === ZERO || instance === ONE);
  } catch {
    return false;
  }
}

/** Steam inventory asset ids are unsigned 64-bit integers encoded as decimal. */
export function isSteamAssetId(value: string): boolean {
  return /^\d{1,20}$/.test(value.trim());
}
