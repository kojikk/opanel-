import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { readServerFile, writeServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.SETTINGS_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  if (!file) {
    return NextResponse.json({ error: "file parameter required" }, { status: 400 });
  }

  const allowedFiles = [
    "server.properties",
    "bukkit.yml",
    "spigot.yml",
    "paper.yml",
    "paper-global.yml",
    "leaves.yml",
    "config/paper-world-defaults.yml",
  ];

  if (!allowedFiles.includes(file)) {
    return NextResponse.json({ error: "File not allowed" }, { status: 403 });
  }

  try {
    const content = await readServerFile(serverId, file);
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.SETTINGS_EDIT);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { file, content } = body;

  if (!file || content === undefined) {
    return NextResponse.json({ error: "file and content required" }, { status: 400 });
  }

  const allowedFiles = [
    "server.properties",
    "bukkit.yml",
    "spigot.yml",
    "paper.yml",
    "paper-global.yml",
    "leaves.yml",
    "config/paper-world-defaults.yml",
  ];

  if (!allowedFiles.includes(file)) {
    return NextResponse.json({ error: "File not allowed" }, { status: 403 });
  }

  try {
    await writeServerFile(serverId, file, content);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
