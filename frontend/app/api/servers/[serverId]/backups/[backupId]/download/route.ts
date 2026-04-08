import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "fs";
import { requirePermission, P } from "@/lib/auth";
import { getBackupArchivePath } from "@/lib/backups/manager";
import { prisma } from "@/lib/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; backupId: string }> },
) {
  const { serverId, backupId } = await params;
  try {
    await requirePermission(request, serverId, P.BACKUP_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup || backup.serverId !== serverId) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    const archivePath = await getBackupArchivePath(serverId, backupId);
    const stream = fs.createReadStream(archivePath);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Content-Length": String(backup.size),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
