"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Marks the signed-in user's notifications read.
 *
 * Scoped by `userId` from the session rather than anything the client sends —
 * a Server Action is a public endpoint, so accepting an id from the browser
 * here would let anyone clear someone else's notifications.
 */
export async function markAllRead(): Promise<void> {
  const user = await getCurrentUser();

  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  // Refreshes the router so the unread badge in the header updates immediately
  // rather than showing a stale count until the next navigation.
  refresh();
}
