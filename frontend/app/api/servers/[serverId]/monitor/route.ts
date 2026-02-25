import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseMspt, parseTps } from "@/lib/rcon/parsers";
import { executeCommand, getServer, getServerStats } from "@/lib/server-manager";

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

  const dockerStats = await getServerStats(serverId);

  let tps = 20;
  let mspt = 0;
  let isPaused = false;

  if (server.pluginInstalled) {
    try {
      const pluginRes = await fetch(`http://localhost:${server.pluginPort}/api/monitor`, {
        signal: AbortSignal.timeout(3000),
      });
      if (pluginRes.ok) {
        const pluginData = await pluginRes.json();
        tps = pluginData.tps ?? tps;
        mspt = pluginData.mspt ?? mspt;
        isPaused = pluginData.isPaused ?? isPaused;
      }
    } catch {
      // plugin unreachable, try RCON
    }
  }

  if (tps === 20 && mspt === 0) {
    try {
      const tpsResponse = await executeCommand(serverId, "tps");
      tps = parseTps(tpsResponse);
    } catch {
      // RCON not available yet
    }

    try {
      const msptResponse = await executeCommand(serverId, "mspt");
      mspt = parseMspt(msptResponse);
    } catch {
      // mspt command not available on this server type
    }
  }

  return NextResponse.json({
    cpu: dockerStats?.cpuPercent ?? 0,
    memory: dockerStats?.memoryUsageMB ?? 0,
    memoryLimit: dockerStats?.memoryLimitMB ?? 0,
    memoryPercent: dockerStats?.memoryPercent ?? 0,
    tps,
    mspt,
    isPaused,
  });
}
