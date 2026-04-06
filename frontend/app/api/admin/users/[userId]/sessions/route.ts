import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, revokeSession, revokeAllUserSessions } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

/** List sessions for a specific user. */
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

  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}

/** Revoke session(s). Body: { sessionId } to revoke one, or { all: true } to revoke all. */
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

  if (body.all) {
    await revokeAllUserSessions(userId);
    return NextResponse.json({ ok: true, revoked: "all" });
  }

  if (body.sessionId) {
    await revokeSession(body.sessionId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "sessionId or all required" }, { status: 400 });
}
