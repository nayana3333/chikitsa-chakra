"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession, readSessionCookie } from "@/lib/auth/session";
import { dashboardPathFor } from "@/lib/auth/dal";
import {
  loginSchema,
  registerSchema,
  type AuthFormState,
} from "@/lib/validation/auth";

const BCRYPT_ROUNDS = 12;

// Comparing against a real hash even when no user matched keeps the response
// time roughly constant, so an attacker can't tell registered emails from
// unregistered ones by timing the request.
const DUMMY_HASH = "$2a$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012";

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    undefined
  );
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, isActive: true },
  });

  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  // One message for every failure mode — wrong email, wrong password, or a
  // disabled account all look identical from outside.
  if (!user || !passwordMatches || !user.isActive) {
    return { message: "Incorrect email or password." };
  }

  await createSession(user.id, user.role);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: "auth.login",
        entity: "User",
        entityId: user.id,
        ip: await clientIp(),
      },
    }),
  ]);

  redirect(dashboardPathFor(user.role));
}

/**
 * Public self-registration, patients only. Staff accounts (doctor, therapist,
 * admin) are created by an administrator from the admin console — letting
 * anyone claim a clinical role from a public form would be the whole security
 * model undone in one input field.
 */
export async function register(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const { firstName, lastName, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      role: "PATIENT",
      firstName,
      lastName,
      phone: phone || null,
      patient: {
        create: {
          mrn: await nextMrn(),
        },
      },
    },
    select: { id: true, role: true },
  });

  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: "auth.register",
      entity: "User",
      entityId: user.id,
      ip: await clientIp(),
    },
  });

  await createSession(user.id, user.role);
  redirect("/patient/onboarding");
}

export async function logout(): Promise<void> {
  const session = await readSessionCookie();
  if (session?.userId) {
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "auth.logout",
        entity: "User",
        entityId: session.userId,
        ip: await clientIp(),
      },
    });
  }
  await deleteSession();
  redirect("/login");
}

/** Sequential, human-readable medical record number: CC-2026-00042. */
async function nextMrn(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.patientProfile.count();
  return `CC-${year}-${String(count + 1).padStart(5, "0")}`;
}

/** Maps a Zod error to the `{ field: messages[] }` shape the forms render. */
function fieldErrors(error: z.ZodError): Record<string, string[]> {
  // flattenError's value type widens to `{}` for a non-generic ZodError; the
  // runtime shape is always string[] per key.
  const { fieldErrors } = z.flattenError(error) as {
    fieldErrors: Record<string, string[] | undefined>;
  };
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => Boolean(entry[1]?.length),
    ),
  );
}
