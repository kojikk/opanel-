import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { listServerDirectory, readServerFile, deleteServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.LOGS_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.LOGS_DELETE);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
