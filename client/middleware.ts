import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * NOTE: Next.js middleware runs on the Edge runtime where localStorage is
 * not available. We use a lightweight `gh_role` cookie (set at login) as a
 * routing hint. The authoritative auth check still lives in each page's
 * useEffect (using localStorage), so middleware is defence-in-depth only.
 */

// Map role → its dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
  ambulance:  "/ambulance",
  driver:     "/ambulance",
  hospital:   "/hospital",
  admin:      "/admin",
  organizer:  "/operator",
  operator:   "/operator",
};

// Protected dashboard routes and the login page they redirect to when unauthenticated
const PROTECTED: { path: string; loginPage: string; roles: string[] }[] = [
  { path: "/admin",     loginPage: "/login/admin",     roles: ["admin", "traffic_control"] },
  { path: "/hospital",  loginPage: "/login/hospital",  roles: ["hospital"] },
  { path: "/ambulance", loginPage: "/login/ambulance", roles: ["ambulance", "driver"] },
  { path: "/operator",  loginPage: "/login/operator",  roles: ["organizer", "operator"] },
];

// Login pages and the role they are for (redirect to dashboard if already authed)
const LOGIN_PAGES: { path: string; roles: string[] }[] = [
  { path: "/login/admin",     roles: ["admin", "traffic_control"] },
  { path: "/login/hospital",  roles: ["hospital"] },
  { path: "/login/ambulance", roles: ["ambulance", "driver"] },
  { path: "/login/operator",  roles: ["organizer", "operator"] },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role  = request.cookies.get("gh_role")?.value  || "";
  const token = request.cookies.get("gh_token")?.value || "";

  // ── 1. Redirect login pages → dashboard when already authenticated ──
  for (const lp of LOGIN_PAGES) {
    if (pathname.startsWith(lp.path)) {
      if (token && lp.roles.includes(role)) {
        const dest = ROLE_DASHBOARD[role];
        if (dest) return NextResponse.redirect(new URL(dest, request.url));
      }
      break;
    }
  }

  // ── 2. Protect dashboard routes ──
  for (const pr of PROTECTED) {
    if (pathname.startsWith(pr.path)) {
      if (!token || !pr.roles.includes(role)) {
        return NextResponse.redirect(new URL(pr.loginPage, request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals, static files, and API
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
