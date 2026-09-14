// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Edge Auth Middleware
// Secures all /admin routes and /api/admin endpoints against unauthenticated access.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse, NextRequest } from "next/server";

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

    if (!sessionCookie) {
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
