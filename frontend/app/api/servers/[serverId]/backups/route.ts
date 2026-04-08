import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { createBackup, listBackups, deleteBackup } from "@/lib/backups/manager";

function authError(e: unknown) {
  const msg = (e as Error).message;
  if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function serializeBackup(b: { id: string; serverId: string; fileName: string; size: bigint; type: string; notes: string | null; createdAt: Date }) {
  return {
    id: b.id,
    serverId: b.serverId,
    fileName: b.fileName,
    size: Number(b.size),
    type: b.type,
    notes: b.notes,
    createdAt: b.createdAt,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try { await requirePermission(request, serverId, P.BACKUP_VIEW); }
  catch (e) { return authError(e); }

  try {
    const backups = await listBackups(serverId);
    return NextResponse.json(backups.map(serializeBackup));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try { await requirePermission(request, serverId, P.BACKUP_CREATE); }
  catch (e) { return authError(e); }

  let body: { notes?: string } = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }

  try {
    const backup = await createBackup(serverId, { type: "MANUAL", notes: body.notes });
    return NextResponse.json(serializeBackup(backup));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try { await requirePermission(request, serverId, P.BACKUP_DELETE); }
  catch (e) { return authError(e); }

  const { backupId } = await request.json();
  if (!backupId) return NextResponse.json({ error: "backupId required" }, { status: 400 });

  try {
    await deleteBackup(serverId, backupId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
