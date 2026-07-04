import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword, verifyPassword, createSession, destroySession, validateSession } from "@/lib/auth";
import { canRegister } from "@/lib/auth-policy";
import { authRateLimiter, getClientKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  const clientKey = getClientKey(request);
  if ((action === "register" || action === "login") && authRateLimiter.isBlocked(clientKey)) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  if (action === "register") {
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const userCount = await prisma.user.count();
    if (!canRegister(userCount)) {
      authRateLimiter.recordFailure(clientKey);
      return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      authRateLimiter.recordFailure(clientKey);
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });

    await createSession(user.id);
    authRateLimiter.reset(clientKey);
    return NextResponse.json({ id: user.id, username: user.username });
  }

  if (action === "login") {
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.password))) {
      authRateLimiter.recordFailure(clientKey);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession(user.id);
    authRateLimiter.reset(clientKey);
    return NextResponse.json({ id: user.id, username: user.username });
  }

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  if (action === "check") {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true },
    });
    return NextResponse.json(user);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
