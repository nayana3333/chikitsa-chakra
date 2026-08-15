import "server-only";

import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { db } from "@/lib/db";
import { readSessionCookie } from "./session";
import type { Role } from "@/generated/prisma/enums";

/**
 * Data Access Layer.
 *
 * Every read of the current user funnels through here, so the authorization
 * check can never be forgotten at a call site. Layouts are deliberately *not*
 * used as the enforcement point: Next.js layouts don't re-render on navigation
 * between sibling routes, so a check there would silently go stale.
 *
 * Each function is wrapped in React's `cache`, which dedupes it for the
 * lifetime of a single render pass. Ten components can call `getCurrentUser()`
 * and the database sees one query.
 */

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
}

/** Cookie-level check. Cheap; does not touch the database. */
export const verifySession = cache(async () => {
  const session = await readSessionCookie();
  if (!session?.userId) redirect("/login");
  return { userId: session.userId, role: session.role };
});

/**
 * Authoritative check. Confirms the user still exists and is still active, so
 * a deactivated account loses access immediately rather than when its JWT
 * happens to expire.
 *
 * Returns a DTO — `passwordHash` is never selected, so it cannot leak into a
 * Server Component's props and across the network boundary to the client.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  const { userId } = await verifySession();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) redirect("/login");

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    avatarUrl: user.avatarUrl,
  };
});

/** Like getCurrentUser but returns null instead of redirecting. For public pages. */
export const getOptionalUser = cache(async (): Promise<SessionUser | null> => {
  const session = await readSessionCookie();
  if (!session?.userId) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    avatarUrl: user.avatarUrl,
  };
});

/**
 * Role gate. Call at the top of any page, Server Action, or Route Handler that
 * is restricted — Server Actions are public HTTP endpoints, so hiding a button
 * in the UI is not access control.
 */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) forbidden();
  return user;
}

/** Resolves the PatientProfile row for the signed-in patient. */
export const requirePatient = cache(async () => {
  const user = await requireRole("PATIENT");
  const profile = await db.patientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, mrn: true, dateOfBirth: true, gender: true },
  });
  if (!profile) redirect("/login");
  return { user, profile };
});

export const requireDoctor = cache(async () => {
  const user = await requireRole("DOCTOR");
  const profile = await db.doctorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, registrationNo: true, consultationFee: true },
  });
  if (!profile) redirect("/login");
  return { user, profile };
});

export const requireTherapist = cache(async () => {
  const user = await requireRole("THERAPIST");
  const profile = await db.therapistProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, employeeCode: true, expertise: true },
  });
  if (!profile) redirect("/login");
  return { user, profile };
});

/** Landing route for each role after login. */
export function dashboardPathFor(role: Role): string {
  switch (role) {
    case "PATIENT":
      return "/patient";
    case "DOCTOR":
      return "/doctor";
    case "THERAPIST":
      return "/therapist";
    case "ADMIN":
      return "/admin";
  }
}
