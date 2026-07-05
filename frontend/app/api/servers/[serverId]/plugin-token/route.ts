import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServer } from "@/lib/server-manager";
import { derivePluginSecret, mintPluginToken, PLUGIN_TOKEN_TTL_SECONDS } from "@/lib/plugin-token";

/**
 * Mints a short-lived HMAC token the companion plugin's WebSocket endpoints
 * accept. Signed with the per-server plugin secret (derived from the RCON
 * password — the same value the panel writes into the plugin's config.yml
 * at install time).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const server = await getServer(serverId);
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
  if (!server.pluginInstalled) {
    return NextResponse.json({ error: "Plugin not installed on this server" }, { status: 409 });
  }

  const token = mintPluginToken(derivePluginSecret(server.rconPassword));
  return NextResponse.json({ token, expiresIn: PLUGIN_TOKEN_TTL_SECONDS });
}
