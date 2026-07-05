import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServer, listServers, reconcileServers } from "@/lib/server-manager";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get("reconcile") === "1") {
    try {
      const result = await reconcileServers();
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
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
  const { name, description, type, mcVersion, memory, cpus, javaVersion, gamePort, rconPort, pluginPort, autoStart } = body;

  if (!name || !type || !mcVersion || !gamePort || !rconPort) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (cpus !== undefined && cpus !== null) {
    if (typeof cpus !== "number" || !Number.isFinite(cpus) || cpus < 0.5 || cpus > 32) {
      return NextResponse.json({ error: "cpus must be a number between 0.5 and 32" }, { status: 400 });
    }
  }

  try {
    const server = await createServer({
      name, description, type, mcVersion, memory, javaVersion,
      cpus: cpus ?? undefined,
      gamePort, rconPort, pluginPort, autoStart,
    });
    return NextResponse.json(server, { status: 201 });
  } catch (e) {
    const message = (e as Error).message;
    const status = message.startsWith("Port conflict") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
