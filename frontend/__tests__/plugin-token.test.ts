import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import {
  derivePluginSecret,
  mintPluginToken,
  verifyPluginToken,
} from "@/lib/plugin-token";

const secret = derivePluginSecret("some-rcon-password");

afterEach(() => {
  vi.useRealTimers();
});

describe("plugin token mint/verify", () => {
  it("round-trips a freshly minted token", () => {
    const token = mintPluginToken(secret);
    expect(verifyPluginToken(token, secret)).toBe(true);
  });

  it("matches the Java-side token format: base64url(payload).base64url(hmac)", () => {
    const token = mintPluginToken(secret);
    const [payloadB64, sigB64] = token.split(".");
    const payloadBytes = Buffer.from(payloadB64, "base64url");
    const payload = JSON.parse(payloadBytes.toString("utf-8"));
    expect(typeof payload.exp).toBe("number");
    const expected = crypto.createHmac("sha256", secret).update(payloadBytes).digest("base64url");
    expect(sigB64).toBe(expected);
  });

  it("rejects a tampered payload", () => {
    const token = mintPluginToken(secret);
    const [, sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 9999 }))
      .toString("base64url");
    expect(verifyPluginToken(`${forgedPayload}.${sig}`, secret)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = mintPluginToken(derivePluginSecret("other-password"));
    expect(verifyPluginToken(token, secret)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = mintPluginToken(secret, 60);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 61_000);
    expect(verifyPluginToken(token, secret)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyPluginToken("", secret)).toBe(false);
    expect(verifyPluginToken("no-dot", secret)).toBe(false);
    expect(verifyPluginToken("a.", secret)).toBe(false);
    expect(verifyPluginToken(".b", secret)).toBe(false);
  });

  it("derives a secret that is not the raw rcon password", () => {
    expect(secret).not.toContain("some-rcon-password");
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });
});
