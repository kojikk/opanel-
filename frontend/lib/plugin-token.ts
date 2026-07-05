import crypto from "crypto";

/**
 * Shared-secret handshake between the panel and the companion plugin.
 *
 * The panel derives a per-server plugin secret from the server's RCON password
 * (so the raw RCON password never sits in the plugin's config file), writes it
 * into the plugin config (`plugins/OPanel/config.yml` -> `accessKey`) at install
 * time, and mints short-lived tokens signed with it for WebSocket connections.
 *
 * Token format (dependency-free; mirrored by the plugin's
 * net.opanel.web.TokenVerifier):
 *   base64url(payloadJson) + "." + base64url(HMAC_SHA256(payloadBytes, secret))
 * where payload = { "exp": <epochSeconds> }.
 */

const SECRET_DERIVATION_LABEL = "opanel-plugin-secret";

export const PLUGIN_TOKEN_TTL_SECONDS = 5 * 60;

/** Derive the per-server plugin secret from the server's RCON password. */
export function derivePluginSecret(rconPassword: string): string {
  return crypto.createHmac("sha256", rconPassword).update(SECRET_DERIVATION_LABEL).digest("hex");
}

function sign(payloadBytes: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadBytes).digest("base64url");
}

/** Mint a short-lived token the plugin's TokenVerifier accepts. */
export function mintPluginToken(secret: string, ttlSeconds: number = PLUGIN_TOKEN_TTL_SECONDS): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${payload.toString("base64url")}.${sign(payload, secret)}`;
}

/**
 * Verify a token (TS mirror of the Java-side check, used by unit tests to
 * guarantee both sides agree on the format).
 */
export function verifyPluginToken(token: string, secret: string): boolean {
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0 || dotIdx === token.length - 1) return false;

  try {
    const payloadBytes = Buffer.from(token.slice(0, dotIdx), "base64url");
    const providedSig = Buffer.from(token.slice(dotIdx + 1), "base64url");
    const expectedSig = Buffer.from(sign(payloadBytes, secret), "base64url");

    if (providedSig.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(expectedSig, providedSig)) return false;

    const payload = JSON.parse(payloadBytes.toString("utf-8"));
    if (typeof payload?.exp !== "number") return false;
    return Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}
