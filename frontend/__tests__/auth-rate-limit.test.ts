import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  resetAllRateLimits,
} from "@/lib/auth/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  it("allows first attempt", () => {
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });

  it("decreases remaining attempts after failures", () => {
    recordFailedAttempt("test-key");
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(4);
  });

  it("blocks after 5 failed attempts", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test-key");
    }
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("clearRateLimit resets the key", () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt("test-key");
    }
    clearRateLimit("test-key");
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });

  it("isolates different keys", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("key-a");
    }
    const resultA = checkRateLimit("key-a");
    const resultB = checkRateLimit("key-b");
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });
});
