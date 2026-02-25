import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readServerFileBuffer, writeServerFileBuffer } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

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
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeServerFileBuffer(serverId, "server-icon.png", buffer);
  return NextResponse.json({ ok: true });
}
