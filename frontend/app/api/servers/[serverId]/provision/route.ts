import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getProvisioningStatus } from "@/lib/server-manager";
import { getServer } from "@/lib/server-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

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
