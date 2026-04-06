import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, ALL_PERMISSIONS } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

/** Get server access entries for a user. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const access = await prisma.serverAccess.findMany({
    where: { userId },
    include: { server: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(access);
}

/** Set server access for a user. Body: { serverId, permissions: string[] } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json();
  const { serverId, permissions } = body as { serverId: string; permissions: string[] };

  if (!serverId || !Array.isArray(permissions)) {
    return NextResponse.json({ error: "serverId and permissions[] required" }, { status: 400 });
  }

  // Validate all permissions are known
  const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p as any));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Unknown permissions: ${invalid.join(", ")}` }, { status: 400 });
  }

  const access = await prisma.serverAccess.upsert({
    where: { userId_serverId: { userId, serverId } },
    create: { userId, serverId, permissions },
    update: { permissions },
  });

  return NextResponse.json(access);
}

/** Remove server access for a user. Body: { serverId } */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json();
  const { serverId } = body;

  if (!serverId) {
    return NextResponse.json({ error: "serverId required" }, { status: 400 });
  }

  await prisma.serverAccess.delete({
    where: { userId_serverId: { userId, serverId } },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
