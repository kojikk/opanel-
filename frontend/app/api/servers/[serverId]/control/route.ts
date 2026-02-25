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
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
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
