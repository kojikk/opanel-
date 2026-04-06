import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, requirePermission, type AuthSession } from "./index";
import type { Permission } from "./permissions";

type RouteContext = { params: Promise<{ serverId: string }> };

/**
 * Wrap an API handler with auth check only (no per-server permission).
 * Returns 401 if not authenticated.
 */
export function withAuth<T>(
  handler: (request: NextRequest, auth: AuthSession, extra: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, extra: T) => {
    try {
      const auth = await requireAuth(request);
      return await handler(request, auth, extra);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (msg === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

/**
 * Wrap an API handler with auth + per-server permission check.
 * Returns 401 if not authenticated, 403 if no permission.
 */
export function withPermission(
  permission: Permission,
  handler: (request: NextRequest, auth: AuthSession, serverId: string) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const { serverId } = await context.params;
      const auth = await requirePermission(request, serverId, permission);
      return await handler(request, auth, serverId);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (msg === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}
