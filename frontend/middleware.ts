import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "opanel-default-secret-change-me"
);
const COOKIE_NAME = "opanel_session";

/** Routes that don't require authentication */
const PUBLIC_PATHS = ["/login", "/about", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Next.js Edge Middleware.
 * - Public routes: pass through
 * - All other routes: verify JWT cookie exists and has valid signature
 * - API routes return 401 JSON
 * - Page routes redirect to /login
 *
 * Note: Full session validation (DB check) happens in the route handler via requireAuth().
 * This middleware only does a fast JWT signature check at the edge to reject obviously
 * invalid/expired tokens early.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — pass through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Static files, _next — pass through
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return denyAccess(request);
  }

  try {
    // Verify JWT signature and expiry (fast, no DB call)
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Invalid or expired token — clear cookie and deny
    const response = denyAccess(request);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

function denyAccess(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect to login for page routes
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
