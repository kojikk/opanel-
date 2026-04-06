import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createSession,
  destroySession,
  validateSession,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from "@/lib/auth";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  // ── Register ───────────────────────────────────────────────────
  if (action === "register") {
    const { username, password, confirmPassword } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    // First user becomes OWNER
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "OWNER" : "USER";

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, role },
    });

    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(user.id, { ip, userAgent });

    return NextResponse.json({ id: user.id, username: user.username, role: user.role });
  }

  // ── Login ──────────────────────────────────────────────────────
  if (action === "login") {
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    // Rate limiting by IP + username
    const ip = getClientIp(request);
    const rateLimitKey = `login:${ip}:${username}`;
    const rateCheck = checkRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || 0) / 1000);
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${retryAfterSec} seconds.` },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.password))) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          error: "Invalid credentials",
          remainingAttempts: rateCheck.remainingAttempts - 1,
        },
        { status: 401 },
      );
    }

    // Successful login — clear rate limit
    clearRateLimit(rateLimitKey);

    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(user.id, { ip, userAgent });

    return NextResponse.json({ id: user.id, username: user.username, role: user.role });
  }

  // ── Logout ─────────────────────────────────────────────────────
  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  // ── Check session ──────────────────────────────────────────────
  if (action === "check") {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    return NextResponse.json(user);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
