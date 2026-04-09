import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, ALL_PERMISSIONS, type Permission } from "@/lib/auth";

/**
 * Returns the current user's effective permissions for a given server.
 * OWNER / ADMIN get all permissions; USER gets whatever is stored in ServerAccess.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;

  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role === "OWNER" || auth.role === "ADMIN") {
    return NextResponse.json({ permissions: ALL_PERMISSIONS });
  }

  const access = await prisma.serverAccess.findUnique({
    where: { userId_serverId: { userId: auth.userId, serverId } },
  });

  const permissions: Permission[] = (access?.permissions as Permission[]) ?? [];
  return NextResponse.json({ permissions });
}
