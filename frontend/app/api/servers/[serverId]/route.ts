import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { getServer, startServer, stopServer, restartServer, deleteServer } from "@/lib/server-manager";

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

  return NextResponse.json(server);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.SERVER_START);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (action === "start") {
      await startServer(serverId);
    } else if (action === "stop") {
      await stopServer(serverId);
    } else if (action === "restart") {
      await restartServer(serverId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.SERVER_DELETE);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteServer(serverId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
