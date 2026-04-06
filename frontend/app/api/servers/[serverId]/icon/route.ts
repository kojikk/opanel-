import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { readServerFileBuffer, writeServerFileBuffer } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.ICON_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await readServerFileBuffer(serverId, "server-icon.png");
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": "image/png" },
    });
  } catch {
    return NextResponse.json({ error: "No icon" }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.ICON_EDIT);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeServerFileBuffer(serverId, "server-icon.png", buffer);
  return NextResponse.json({ ok: true });
}
