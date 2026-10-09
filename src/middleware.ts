// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Edge Auth Middleware
// A cheap first gate in front of /admin, /account, /wallet and /withdraw.
//
// This is NOT the security boundary. It only turns away requests whose cookie
// is missing or is not even shaped like a session token (for example the old
// bare user id), so signed-out visitors are redirected quickly. Whether a
// token is genuine, and who it belongs to, is decided in the route handlers
// and pages by lib/auth/guards.ts and lib/auth/requireAuth.ts.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse, NextRequest } from "next/server";

// <base64url payload>.<43-character base64url HMAC-SHA256 signature>
const SESSION_TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,1500}\.[A-Za-z0-9_-]{43}$/;

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

// Protect /admin, /account, /wallet, /withdraw, and /api/ account routes
  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/api/admin") ||
    path.startsWith("/account") ||
    path.startsWith("/wallet") ||
    path.startsWith("/withdraw") ||
    path.startsWith("/api/account");

  if (isProtected) {
    const sessionCookie = request.cookies.get("cp_session")?.value;

    if (!sessionCookie || !SESSION_TOKEN_SHAPE.test(sessionCookie)) {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Authentication required." },
          { status: 401 }
        );
      }

      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }

    // Demo Mode Guard: Prevent any database mutations (POST, PUT, DELETE, PATCH) on admin APIs
    const isDemoMode =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      process.env.DEMO_MODE === "true";

    if (isDemoMode && path.startsWith("/api/admin") && request.method !== "GET") {
      return NextResponse.json(
        {
          success: false,
          error: "Demo Mode Active: Modifications are disabled in public live preview mode.",
          isDemoMode: true,
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/account/:path*",
    "/wallet",
    "/withdraw",
    "/api/account/:path*",
  ],
};
