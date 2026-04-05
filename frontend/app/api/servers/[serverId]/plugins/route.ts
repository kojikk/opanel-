import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listServerDirectory, readServerFileBuffer, writeServerFileBuffer, deleteServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("download");

  if (fileName) {
    try {
      const data = await readServerFileBuffer(serverId, `plugins/${fileName}`);
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": "application/java-archive",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 404 });
    }
  }

  const files = await listServerDirectory(serverId, "plugins");
  const plugins = files
    .filter((f) => !f.isDirectory && (f.name.endsWith(".jar") || f.name.endsWith(".jar.disabled")))
    .map((f) => ({
      name: f.name.replace(/\.disabled$/, ""),
      fileName: f.name,
      size: f.size,
      enabled: f.name.endsWith(".jar"),
    }));

  return NextResponse.json(plugins);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "toggle") {
    const { fileName, enabled } = await request.json();
    const currentPath = `plugins/${fileName}`;
    const newFileName = enabled
      ? fileName.replace(/\.disabled$/, "")
      : `${fileName}.disabled`;
    const newPath = `plugins/${newFileName}`;

    try {
      const data = await readServerFileBuffer(serverId, currentPath);
      await writeServerFileBuffer(serverId, newPath, data);
      await deleteServerFile(serverId, currentPath);
      return NextResponse.json({ ok: true, fileName: newFileName });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeServerFileBuffer(serverId, `plugins/${file.name}`, buffer);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const { fileName } = await request.json();

  try {
    await deleteServerFile(serverId, `plugins/${fileName}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
