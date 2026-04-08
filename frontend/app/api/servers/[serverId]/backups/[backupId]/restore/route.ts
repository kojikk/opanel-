import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { restoreBackup, inspectBackup } from "@/lib/backups/manager";

function authError(e: unknown) {
  const msg = (e as Error).message;
  if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** GET top-level entries in the archive (for partial-restore UI). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; backupId: string }> },
) {
  const { serverId, backupId } = await params;
  try { await requirePermission(request, serverId, P.BACKUP_VIEW); }
  catch (e) { return authError(e); }

  try {
    const entries = await inspectBackup(serverId, backupId);
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST to trigger a restore. Body: { paths?: string[] } */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; backupId: string }> },
) {
  const { serverId, backupId } = await params;
  try { await requirePermission(request, serverId, P.BACKUP_RESTORE); }
  catch (e) { return authError(e); }

  let body: { paths?: string[] } = {};
  try { body = await request.json(); } catch { /* empty body */ }

  try {
    await restoreBackup(serverId, backupId, { paths: body.paths });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes("must be stopped") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
