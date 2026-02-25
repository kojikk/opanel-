import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getServer, startServer, stopServer, deleteServer } from "@/lib/server-manager";

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

  return NextResponse.json(server);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const body = await request.json();
  const { action } = body;

  try {
    if (action === "start") {
      await startServer(serverId);
    } else if (action === "stop") {
      await stopServer(serverId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  try {
    await deleteServer(serverId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
