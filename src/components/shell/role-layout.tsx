import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { AppShell } from "./app-shell";
import type { Role } from "@/generated/prisma/enums";
import { forbidden } from "next/navigation";

/**
 * Shared wrapper for the four role areas.
 *
 * The role check lives here *and* in every page's own data call. Next.js
 * layouts don't re-render on navigation between sibling routes, so a layout
 * check alone would go stale — this is a convenience, not the security
 * boundary. The boundary is the DAL.
 */
export async function RoleLayout({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user.role !== role) forbidden();

  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <AppShell user={user} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
