import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative, humanise } from "@/lib/utils";
import { markAllRead } from "@/app/actions/notifications";
import Link from "next/link";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description={
          unread.length > 0
            ? `${unread.length} unread`
            : "You are all caught up."
        }
        action={
          unread.length > 0 ? (
            <form action={markAllRead}>
              <Button type="submit" variant="outline" size="sm">
                Mark all read
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          description="Session reminders, plan updates and invoices will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {notifications.map((n) => {
            const body = (
              <Card
                className={
                  n.readAt ? "opacity-70" : "border-primary/30 bg-primary/[0.03]"
                }
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge variant={n.readAt ? "muted" : "default"}>
                        {humanise(n.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );

            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="block rounded-xl">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
