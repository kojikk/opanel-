package net.opanel.web;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Verifies short-lived HMAC tokens minted by the panel.
 * <p>
 * Token format (dependency-free, mirrored by the panel's lib/plugin-token.ts):
 * <pre>base64url(payloadJson) + "." + base64url(HMAC_SHA256(payloadBytes, secret))</pre>
 * where payload is a JSON object like {@code {"exp": <epochSeconds>}} and the
 * secret is the shared {@code accessKey} from the plugin config (provisioned by
 * the panel at install time).
 */
public final class TokenVerifier {
    private TokenVerifier() { }

    public static boolean verify(String token, String secret) {
        if(token == null || secret == null || secret.isEmpty()) return false;

        final int dotIdx = token.indexOf('.');
        if(dotIdx <= 0 || dotIdx == token.length() - 1) return false;

        try {
            final Base64.Decoder decoder = Base64.getUrlDecoder();
            final byte[] payloadBytes = decoder.decode(token.substring(0, dotIdx));
            final byte[] providedSig = decoder.decode(token.substring(dotIdx + 1));

            final Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            final byte[] expectedSig = mac.doFinal(payloadBytes);

            // Constant-time comparison
            if(!MessageDigest.isEqual(expectedSig, providedSig)) return false;

            final JsonObject payload = new Gson().fromJson(
                    new String(payloadBytes, StandardCharsets.UTF_8),
                    JsonObject.class
            );
            if(payload == null || !payload.has("exp")) return false;

            final long exp = payload.get("exp").getAsLong();
            return System.currentTimeMillis() / 1000 < exp;
        } catch (Exception e) {
            return false;
        }
    }
}
