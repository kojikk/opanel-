import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listServerDirectory, deleteServerFile, fileExists } from "@/lib/file-manager";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  try {
    const entries = await listServerDirectory(serverId, ".");
    const worldDirs = entries.filter(
      (e) => e.isDirectory && !e.name.startsWith(".") && !["logs", "plugins", "config", "cache"].includes(e.name)
    );

    const saves = [];
    for (const dir of worldDirs) {
      const hasLevelDat = await fileExists(serverId, `${dir.name}/level.dat`);
      if (hasLevelDat) {
        saves.push({
          name: dir.name,
          size: dir.size,
        });
      }
    }

    return NextResponse.json(saves);
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
  const { saveName } = await request.json();

  if (!saveName || saveName.includes("..")) {
    return NextResponse.json({ error: "Invalid save name" }, { status: 400 });
  }

  try {
    await deleteServerFile(serverId, saveName);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
