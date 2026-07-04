import { describe, expect, it } from "vitest";

import { RateLimiter, getClientKey } from "@/lib/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;

function createLimiter(startTime = 0) {
  let time = startTime;
  const limiter = new RateLimiter({ max: 5, windowMs: WINDOW_MS, now: () => time });
  return {
    limiter,
    advance: (ms: number) => { time += ms; },
  };
}

describe("RateLimiter", () => {
  it("blocks the 6th attempt after 5 failures", () => {
    const { limiter } = createLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.isBlocked("1.2.3.4")).toBe(false);
      limiter.recordFailure("1.2.3.4");
    }
    expect(limiter.isBlocked("1.2.3.4")).toBe(true);
  });

  it("allows attempts again after the window passes", () => {
    const { limiter, advance } = createLimiter();
    for (let i = 0; i < 5; i++) limiter.recordFailure("1.2.3.4");
    expect(limiter.isBlocked("1.2.3.4")).toBe(true);

    advance(WINDOW_MS + 1);
    expect(limiter.isBlocked("1.2.3.4")).toBe(false);
  });

  it("uses a sliding window — old failures expire individually", () => {
    const { limiter, advance } = createLimiter();
    limiter.recordFailure("k");
    limiter.recordFailure("k");
    advance(WINDOW_MS - 1000);
    limiter.recordFailure("k");
    limiter.recordFailure("k");
    limiter.recordFailure("k");
    expect(limiter.isBlocked("k")).toBe(true);

    advance(2000); // first two failures fall out of the window
    expect(limiter.isBlocked("k")).toBe(false);
  });

  it("successes do not consume the budget and reset clears it", () => {
    const { limiter } = createLimiter();
    for (let i = 0; i < 4; i++) limiter.recordFailure("k");
    // Successful login: reset instead of recordFailure.
    limiter.reset("k");
    for (let i = 0; i < 5; i++) {
      expect(limiter.isBlocked("k")).toBe(false);
      limiter.recordFailure("k");
    }
    expect(limiter.isBlocked("k")).toBe(true);
  });

  it("tracks keys independently", () => {
    const { limiter } = createLimiter();
    for (let i = 0; i < 5; i++) limiter.recordFailure("a");
    expect(limiter.isBlocked("a")).toBe(true);
    expect(limiter.isBlocked("b")).toBe(false);
  });
});

describe("getClientKey", () => {
  function fakeRequest(xff: string | null) {
    return { headers: { get: (name: string) => (name === "x-forwarded-for" ? xff : null) } };
  }

  it("takes the first IP from x-forwarded-for", () => {
    expect(getClientKey(fakeRequest("1.2.3.4, 5.6.7.8"))).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' without the header", () => {
    expect(getClientKey(fakeRequest(null))).toBe("unknown");
  });
});
