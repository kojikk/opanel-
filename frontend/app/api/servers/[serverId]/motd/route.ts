import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readServerFile, writeServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

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
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
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
