import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "opanel-default-secret-change-me"
);
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = "opanel_session";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(JWT_SECRET);

  await prisma.session.create({
    data: { token, userId, expiresAt },
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

export async function validateSession(request?: NextRequest): Promise<{ userId: string } | null> {
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

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { token } });
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    cookieStore.delete(COOKIE_NAME);
  }
}

export async function requireAuth(request?: NextRequest) {
  const session = await validateSession(request);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
