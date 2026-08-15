import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, COOKIE_NAME } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/enums";

/**
 * Formerly `middleware.ts` — renamed to `proxy` in Next.js 16.
 *
 * This is an *optimistic* gate only. It runs on every request including
 * prefetches, so it reads the signed cookie and nothing else — no database
 * round trip. Real authorization happens in the Data Access Layer next to the
 * data itself (`src/lib/auth/dal.ts`); this exists to bounce obviously
 * signed-out traffic early and to keep users out of the wrong role's area
 * before a page starts rendering.
 */

const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  THERAPIST: "/therapist",
  ADMIN: "/admin",
};

// Route prefix → roles permitted to enter it.
const PROTECTED: { prefix: string; roles: Role[] }[] = [
  { prefix: "/patient", roles: ["PATIENT"] },
  { prefix: "/doctor", roles: ["DOCTOR"] },
  { prefix: "/therapist", roles: ["THERAPIST"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

// Signed-in users get redirected away from these to their dashboard.
const AUTH_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  const rule = PROTECTED.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );

  if (rule) {
    if (!session) {
      // Remember where they were headed so login can return them there.
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!rule.roles.includes(session.role)) {
      // Authenticated but in the wrong wing of the app — send them home
      // rather than to login, which would wrongly imply they're signed out.
      return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
    }
  }

  if (session && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and image optimisation; run on everything else.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
