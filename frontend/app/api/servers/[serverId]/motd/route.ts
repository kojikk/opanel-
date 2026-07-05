import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readServerFile, writeServerFile, fileExists } from "@/lib/file-manager";

function getMotd(content: string): string {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("motd=")) {
      return trimmed.slice(5);
    }
  }
  return "A Minecraft Server";
}

function setMotd(content: string, motd: string): string {
  const lines = content.split("\n");
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("motd=")) {
      lines[i] = `motd=${motd}`;
      found = true;
      break;
    }
  }
  if (!found) lines.push(`motd=${motd}`);
  return lines.join("\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  try {
    const exists = await fileExists(serverId, "server.properties");
    if (!exists) {
      return NextResponse.json({ motd: "A Minecraft Server" });
    }
    const content = await readServerFile(serverId, "server.properties");
    return NextResponse.json({ motd: getMotd(content) });
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
    return NextResponse.json({ error: "motd must be a string" }, { status: 400 });
  }

  try {
    let content = "";
    const exists = await fileExists(serverId, "server.properties");
    if (exists) {
      content = await readServerFile(serverId, "server.properties");
    }
    const updated = setMotd(content, motd);
    await writeServerFile(serverId, "server.properties", updated);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
