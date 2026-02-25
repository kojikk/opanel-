import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServer, listServers } from "@/lib/server-manager";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const servers = await listServers();
  return NextResponse.json(servers);
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, mcVersion, memory, gamePort, rconPort, pluginPort } = body;

  if (!name || !type || !mcVersion || !gamePort || !rconPort) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const server = await createServer({ name, type, mcVersion, memory, gamePort, rconPort, pluginPort });
    return NextResponse.json(server, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
