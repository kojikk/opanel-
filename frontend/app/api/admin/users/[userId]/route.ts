import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, revokeAllUserSessions } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import type { GlobalRole } from "@prisma/client";

/** Update user role or delete user. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await request.json();
  const { role } = body as { role?: GlobalRole };

  if (!role || !["OWNER", "ADMIN", "USER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only OWNER can assign ADMIN role
  if (role === "ADMIN" && auth.role !== "OWNER") {
    return NextResponse.json({ error: "Only OWNER can assign ADMIN role" }, { status: 403 });
  }

  // Nobody can assign OWNER role
  if (role === "OWNER") {
    return NextResponse.json({ error: "Cannot assign OWNER role" }, { status: 403 });
  }

  // ADMIN can only change USER roles (not other ADMINs or OWNER)
  if (auth.role === "ADMIN") {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role !== "USER") {
      return NextResponse.json({ error: "Cannot modify this user's role" }, { status: 403 });
    }
  }

  // Cannot change own role
  if (userId === auth.userId) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, username: true, role: true },
  });

  return NextResponse.json(updated);
}

/** Delete a user. OWNER/ADMIN only. */
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

  // Cannot delete yourself
  if (userId === auth.userId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  // ADMIN cannot delete OWNER or other ADMINs
  if (auth.role === "ADMIN") {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role !== "USER") {
      return NextResponse.json({ error: "Cannot delete this user" }, { status: 403 });
    }
  }

  // Revoke all sessions first, then delete
  await revokeAllUserSessions(userId);
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
