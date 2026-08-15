import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/enums";

const COOKIE_NAME = "chikitsa_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Claims carried in the session cookie.
 *
 * Deliberately minimal: an id and a role, nothing else. Anything richer (name,
 * email, clinical data) is read from the database through the DAL so that a
 * stolen or stale cookie never leaks patient information, and so that a role
 * change or deactivation takes effect immediately rather than at token expiry.
 */
export interface SessionPayload {
  userId: string;
  role: Role;
  expiresAt: number;
  [key: string]: unknown; // satisfies jose's JWTPayload index signature
}

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch {
    // Tampered, expired, or signed with a rotated secret — all mean "no session".
    return null;
  }
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await encryptSession({ userId, role, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, // unreachable from document.cookie, so XSS can't lift it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // blocks cross-site form-post CSRF while keeping normal links working
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Reads and verifies the session cookie. Returns null when absent or invalid. */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME };
