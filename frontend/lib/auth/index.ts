import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import type { GlobalRole } from "@prisma/client";
import type { Permission } from "./permissions";

export { hashPassword, verifyPassword, validatePasswordStrength } from "./password";
export { checkRateLimit, recordFailedAttempt, clearRateLimit } from "./rate-limit";
export { P, ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from "./permissions";

// ── Config ──────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "opanel-default-secret-change-me"
);
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = "opanel_session";

// ── Types ───────────────────────────────────────────────────────────

export interface AuthSession {
  userId: string;
  sessionId: string;
  role: GlobalRole;
}

// ── Session lifecycle ───────────────────────────────────────────────

export async function createSession(
  userId: string,
  opts?: { ip?: string; userAgent?: string },
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Create DB session first to get the ID
  const session = await prisma.session.create({
    data: {
      token: "pending", // will update after signing
      userId,
      ip: opts?.ip ?? null,
      userAgent: opts?.userAgent ?? null,
      expiresAt,
    },
  });

  const token = await new SignJWT({ userId, sessionId: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(JWT_SECRET);

  await prisma.session.update({
    where: { id: session.id },
    data: { token },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/**
 * Validate session from JWT cookie.
 * Checks JWT signature, DB session existence, and expiry.
 * Returns null if invalid — caller should return 401.
 */
export async function validateSession(request?: NextRequest): Promise<AuthSession | null> {
  let token: string | undefined;

  if (request) {
    token = request.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    const sessionId = payload.sessionId as string;

    if (!userId || !sessionId) return null;

    // Verify session exists and is not expired
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.token !== token || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return null;
    }

    return { userId: session.user.id, sessionId: session.id, role: session.user.role };
  } catch {
    return null;
  }
}

/** Destroy the current session (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    // Find and delete by token
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    cookieStore.delete(COOKIE_NAME);
  }
}

/** Revoke a specific session by ID (admin action). */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/** Revoke all sessions for a user. */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// ── Auth guards ─────────────────────────────────────────────────────

/** Require authentication. Throws if not authenticated. */
export async function requireAuth(request?: NextRequest): Promise<AuthSession> {
  const session = await validateSession(request);
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Check if a user has a specific permission on a server.
 * OWNER and ADMIN bypass permission checks entirely.
 */
export async function hasPermission(
  auth: AuthSession,
  serverId: string,
  permission: Permission,
): Promise<boolean> {
  // OWNER and ADMIN have full access
  if (auth.role === "OWNER" || auth.role === "ADMIN") return true;

  const access = await prisma.serverAccess.findUnique({
    where: { userId_serverId: { userId: auth.userId, serverId } },
  });

  if (!access) return false;
  return access.permissions.includes(permission);
}

/**
 * Check if a user can see a server at all.
 * OWNER/ADMIN see everything, USER needs server.view permission.
 */
export async function canViewServer(auth: AuthSession, serverId: string): Promise<boolean> {
  if (auth.role === "OWNER" || auth.role === "ADMIN") return true;

  const access = await prisma.serverAccess.findUnique({
    where: { userId_serverId: { userId: auth.userId, serverId } },
  });

  return !!access && access.permissions.includes("server.view");
}

/**
 * Get all server IDs a user can view.
 * OWNER/ADMIN: all servers. USER: only those with server.view access.
 */
export async function getAccessibleServerIds(auth: AuthSession): Promise<string[] | "all"> {
  if (auth.role === "OWNER" || auth.role === "ADMIN") return "all";

  const accesses = await prisma.serverAccess.findMany({
    where: { userId: auth.userId, permissions: { has: "server.view" } },
    select: { serverId: true },
  });

  return accesses.map((a) => a.serverId);
}

// ── Helpers for API routes ──────────────────────────────────────────

/** Require auth + specific permission on a server. Returns auth session or Response. */
export async function requirePermission(
  request: NextRequest,
  serverId: string,
  permission: Permission,
): Promise<AuthSession> {
  const auth = await requireAuth(request);

  if (!(await hasPermission(auth, serverId, permission))) {
    throw new Error("Forbidden");
  }

  return auth;
}
