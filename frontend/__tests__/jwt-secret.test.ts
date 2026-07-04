import { describe, expect, it } from "vitest";

import { assertValidJwtSecret } from "@/lib/auth-policy";

describe("assertValidJwtSecret", () => {
  it("throws when the secret is unset", () => {
    expect(() => assertValidJwtSecret(undefined)).toThrow(/JWT_SECRET/);
    expect(() => assertValidJwtSecret("")).toThrow(/JWT_SECRET/);
  });

  it("throws on known placeholder values", () => {
    expect(() => assertValidJwtSecret("change-this-to-a-secure-random-string")).toThrow(/placeholder/);
    expect(() => assertValidJwtSecret("opanel-default-secret-change-me")).toThrow(/placeholder/);
  });

  it("throws when the secret is shorter than 32 characters", () => {
    expect(() => assertValidJwtSecret("short-secret")).toThrow(/at least 32/);
    expect(() => assertValidJwtSecret("a".repeat(31))).toThrow(/at least 32/);
  });

  it("accepts a 48-byte base64 secret", () => {
    const secret = Buffer.from(new Uint8Array(48).fill(7)).toString("base64");
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(() => assertValidJwtSecret(secret)).not.toThrow();
  });
});
