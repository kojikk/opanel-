import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { getProvisioningStatus, getServer } from "@/lib/server-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.SERVER_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getProvisioningStatus(serverId);
  if (status) {
    return NextResponse.json(status);
  }

  // No in-memory status — check if server is already provisioned
  const server = await getServer(serverId);
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  if (server.containerId && server.status === "running") {
    return NextResponse.json({ step: "ready", progress: 100, message: "Server is ready!" });
  }

  if (server.containerId) {
    return NextResponse.json({ step: "ready", progress: 100, message: "Server created." });
  }

  return NextResponse.json({ step: "queued", progress: 0, message: "Waiting..." });
}
