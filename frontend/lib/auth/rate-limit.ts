/**
 * Simple in-memory rate limiter for brute-force protection.
 * Tracks attempts per key (IP or username) with a sliding window.
 */

interface AttemptRecord {
  timestamps: number[];
  lockedUntil: number;
}

const store = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;    // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000;   // 15-minute lockout after max attempts

/** Cleanup old entries periodically */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, record] of store) {
    const fresh = record.timestamps.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0 && record.lockedUntil < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remainingAttempts: number;
}

/** Check if a key is rate-limited. Call BEFORE processing the request. */
export function checkRateLimit(key: string): RateLimitResult {
  cleanup();
  const now = Date.now();
  const record = store.get(key) || { timestamps: [], lockedUntil: 0 };

  // Currently locked out
  if (record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: record.lockedUntil - now,
      remainingAttempts: 0,
    };
  }

  // Clean old timestamps
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  const remaining = MAX_ATTEMPTS - record.timestamps.length;

  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
}

/** Record a failed attempt for a key. */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = store.get(key) || { timestamps: [], lockedUntil: 0 };

  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  record.timestamps.push(now);

  if (record.timestamps.length >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }

  store.set(key, record);
}

/** Clear rate limit for a key (e.g. after successful login). */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

/** Reset all rate limits (for testing). */
export function resetAllRateLimits(): void {
  store.clear();
}
