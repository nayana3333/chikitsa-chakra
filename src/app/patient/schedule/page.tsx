import { CalendarDays } from "lucide-react";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseBadge, SessionStatusBadge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata = { title: "My schedule" };

export default async function PatientSchedule() {
  const { profile } = await requirePatient();

  const sessions = await db.therapySession.findMany({
    where: { plan: { patientId: profile.id } },
    orderBy: { scheduledStart: "asc" },
    include: {
      room: { select: { name: true } },
      therapist: { include: { user: { select: { firstName: true, lastName: true } } } },
      plan: { select: { totalDays: true, therapyType: true } },
    },
  });

  // Group by calendar day so the list reads like a diary rather than a dump.
  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = formatDate(s.scheduledStart, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My schedule"
        description="Every session in your therapy plan, past and upcoming."
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No sessions scheduled"
          description="Sessions appear here once your doctor prescribes a therapy plan."
        />
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, daySessions]) => {
            const isToday =
              new Date(daySessions[0].scheduledStart).setHours(0, 0, 0, 0) ===
              today.getTime();
            return (
              <Card key={day} className={isToday ? "border-primary/40" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    {day}
                    {isToday && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        Today
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {daySessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{s.procedureName}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            Day {s.dayNumber} of {s.plan.totalDays}
                            {s.room && ` · ${s.room.name}`}
                            {s.therapist &&
                              ` · ${s.therapist.user.firstName} ${s.therapist.user.lastName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatTime(s.scheduledStart)}
                          </span>
                          <PhaseBadge phase={s.phase} short />
                          <SessionStatusBadge status={s.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
