import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, getAccessibleServerIds, P, hasPermission } from "@/lib/auth";
import { createServer, listServers } from "@/lib/server-manager";

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const servers = await listServers();
  const accessible = await getAccessibleServerIds(auth);

  if (accessible === "all") {
    return NextResponse.json(servers);
  }

  const filtered = servers.filter((s) => accessible.includes(s.id));
  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only OWNER/ADMIN can create servers
  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, type, mcVersion, memory, javaVersion, gamePort, rconPort, pluginPort, autoStart } = body;

  if (!name || !type || !mcVersion || !gamePort || !rconPort) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const server = await createServer({
      name, description, type, mcVersion, memory, javaVersion,
      gamePort, rconPort, pluginPort, autoStart,
    });
    return NextResponse.json(server, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
