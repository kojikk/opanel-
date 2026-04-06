import { describe, it, expect } from "vitest";
import { validatePasswordStrength } from "@/lib/auth/password";

describe("validatePasswordStrength", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePasswordStrength("Ab1!")).toBe("Password must be at least 8 characters");
  });

  it("rejects passwords longer than 128 characters", () => {
    const long = "Aa1!" + "x".repeat(125);
    expect(validatePasswordStrength(long)).toBe("Password must be at most 128 characters");
  });

  it("rejects passwords without lowercase letter", () => {
    expect(validatePasswordStrength("ABCDEFG1!")).toBe("Password must contain a lowercase letter");
  });

  it("rejects passwords without uppercase letter", () => {
    expect(validatePasswordStrength("abcdefg1!")).toBe("Password must contain an uppercase letter");
  });

  it("rejects passwords without a number", () => {
    expect(validatePasswordStrength("Abcdefgh!")).toBe("Password must contain a number");
  });

  it("rejects passwords without special character", () => {
    expect(validatePasswordStrength("Abcdefg1")).toBe("Password must contain a special character");
  });

  it("accepts valid passwords", () => {
    expect(validatePasswordStrength("MyP@ssw0rd")).toBeNull();
    expect(validatePasswordStrength("Str0ng!Pass")).toBeNull();
    expect(validatePasswordStrength("abcDEF12#$")).toBeNull();
  });
});
