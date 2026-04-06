import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { readServerFile, writeServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.ICON_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const content = await readServerFile(serverId, "server.properties");
    const match = content.match(/^motd=(.*)$/m);
    const motd = match ? match[1] : "A Minecraft Server";
    return NextResponse.json({ motd });
  } catch {
    return NextResponse.json({ motd: "A Minecraft Server" });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.ICON_EDIT);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { motd } = body;

  if (typeof motd !== "string") {
    return NextResponse.json({ error: "motd is required" }, { status: 400 });
  }

  try {
    const content = await readServerFile(serverId, "server.properties");

    const updated = content.match(/^motd=/m)
      ? content.replace(/^motd=.*$/m, `motd=${motd}`)
      : `${content.trimEnd()}\nmotd=${motd}\n`;

    await writeServerFile(serverId, "server.properties", updated);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
