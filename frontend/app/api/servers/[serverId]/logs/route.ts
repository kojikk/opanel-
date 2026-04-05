import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listServerDirectory, readServerFile, deleteServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("file");

  if (fileName) {
    try {
      const content = await readServerFile(serverId, `logs/${fileName}`);
      return NextResponse.json({ content });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 404 });
    }
  }

  const files = await listServerDirectory(serverId, "logs");
  const logFiles = files
    .filter((f) => !f.isDirectory && (f.name.endsWith(".log") || f.name.endsWith(".log.gz")))
    .map((f) => ({ name: f.name, size: f.size }));

  return NextResponse.json(logFiles);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("file");

  try {
    if (fileName) {
      await deleteServerFile(serverId, `logs/${fileName}`);
    } else {
      const files = await listServerDirectory(serverId, "logs");
      for (const f of files) {
        if (f.name.endsWith(".log.gz")) {
          await deleteServerFile(serverId, `logs/${f.name}`);
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
