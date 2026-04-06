import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { getServer } from "@/lib/server-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.SERVER_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const server = await getServer(serverId);
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  return NextResponse.json({
    pluginWsUrl: `ws://localhost:${server.pluginPort}`,
    endpoints: {
      players: `/socket/players`,
      terminal: `/socket/terminal`,
      inventory: `/socket/inventory`,
    },
  });
}
