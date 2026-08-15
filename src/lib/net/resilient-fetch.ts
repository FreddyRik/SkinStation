/**
 * Bounded HTTP helpers: 4s default timeout, exponential backoff, no hung awaits.
 */

export const UPSTREAM_STEP_TIMEOUT_MS = 4_000;
export const UPSTREAM_RETRY_CAP = 2;

function abortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || /aborted|timeout/i.test(err.message);
}

export function backoffDelayMs(attempt: number, baseMs = 250, capMs = 4_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * Math.min(120, exp * 0.2));
  return exp + jitter;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = UPSTREAM_STEP_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function fetchWithBackoff(
  url: string,
  init: RequestInit = {},
  options?: {
    timeoutMs?: number;
    retries?: number;
    baseDelayMs?: number;
    retryOn?: (res: Response) => boolean;
  },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? UPSTREAM_STEP_TIMEOUT_MS;
  const retries = options?.retries ?? UPSTREAM_RETRY_CAP;
  const retryOn =
    options?.retryOn ??
    ((res) => res.status === 429 || res.status >= 500);

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      if (attempt < retries && retryOn(res)) {
        await sleep(backoffDelayMs(attempt, options?.baseDelayMs));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt >= retries || !abortError(err)) {
        throw err;
      }
      await sleep(backoffDelayMs(attempt, options?.baseDelayMs));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Upstream request failed.");
}
