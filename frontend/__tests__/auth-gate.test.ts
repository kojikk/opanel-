import { describe, expect, it } from "vitest";

import { canRegister } from "@/lib/auth-policy";

describe("canRegister", () => {
  it("allows registration when the user table is empty (first-run bootstrap)", () => {
    expect(canRegister(0)).toBe(true);
  });

  it("rejects registration once at least one user exists", () => {
    expect(canRegister(1)).toBe(false);
    expect(canRegister(2)).toBe(false);
    expect(canRegister(100)).toBe(false);
  });
});
