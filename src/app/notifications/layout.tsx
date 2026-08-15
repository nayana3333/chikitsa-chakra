import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";

// Notifications are the one area every role shares, so this layout authenticates
// without restricting to a particular role. The sidebar still renders that
// user's own navigation.
export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <AppShell user={user} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
