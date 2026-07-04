export interface RateLimiterOptions {
  /** Maximum number of failures allowed within the window. */
  max: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
  /** Clock override for tests. */
  now?: () => number;
}

/** In-memory sliding-window rate limiter keyed by an arbitrary string (e.g. client IP). */
export class RateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly failures = new Map<string, number[]>();

  constructor({ max, windowMs, now = Date.now }: RateLimiterOptions) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Drops timestamps that fell out of the window; removes empty keys. */
  private prune(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const timestamps = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
    if(timestamps.length === 0) {
      this.failures.delete(key);
    } else {
      this.failures.set(key, timestamps);
    }
    return timestamps;
  }

  /** True if the key has exhausted its failure budget within the window. */
  isBlocked(key: string): boolean {
    return this.prune(key).length >= this.max;
  }

  /** Records a failed attempt for the key. */
  recordFailure(key: string): void {
    const timestamps = this.prune(key);
    timestamps.push(this.now());
    this.failures.set(key, timestamps);
  }

  /** Clears the failure budget for the key (e.g. after a successful login). */
  reset(key: string): void {
    this.failures.delete(key);
  }
}

/** Shared limiter for auth attempts: max 5 failures per key per 10 minutes. */
export const authRateLimiter = new RateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

/** Extracts the client key (IP) used for rate limiting from a request-like object. */
export function getClientKey(request: { headers: { get(name: string): string | null } }): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
