import { CalendarDays, CheckCircle2, Clock, Layers } from "lucide-react";
import { requireTherapist } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge, PhaseBadge, SessionStatusBadge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/page";
import { Avatar, AvatarFallback } from "@/components/ui/misc";
import { formatDate, formatTime, humanise, initialsOf } from "@/lib/utils";

export const metadata = { title: "Today" };

export default async function TherapistToday() {
  const { user, profile } = await requireTherapist();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);

  const [todaySessions, weekCount, completedThisWeek, upcoming] = await Promise.all([
    db.therapySession.findMany({
      where: {
        therapistId: profile.id,
        scheduledStart: { gte: startOfToday, lt: endOfToday },
      },
      orderBy: { scheduledStart: "asc" },
      include: {
        room: { select: { name: true } },
        plan: {
          include: {
            patient: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),

    db.therapySession.count({
      where: {
        therapistId: profile.id,
        scheduledStart: { gte: startOfToday, lt: endOfWeek },
      },
    }),

    db.therapySession.count({
      where: {
        therapistId: profile.id,
        status: "COMPLETED",
        scheduledStart: { gte: new Date(startOfToday.getTime() - 7 * 86400000) },
      },
    }),

    db.therapySession.findMany({
      where: {
        therapistId: profile.id,
        scheduledStart: { gte: endOfToday, lt: endOfWeek },
      },
      orderBy: { scheduledStart: "asc" },
      take: 8,
      include: {
        room: { select: { name: true } },
        plan: {
          include: {
            patient: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    }),
  ]);

  const remaining = todaySessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "CONFIRMED",
  ).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Namaste, ${user.firstName}`}
        description={`${humanise(profile.expertise[0] ?? "")}${profile.expertise.length > 1 ? ` +${profile.expertise.length - 1} more` : ""} · Employee ${profile.employeeCode}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions today" value={todaySessions.length} icon={CalendarDays} />
        <StatCard label="Still to do" value={remaining} icon={Clock} tone={remaining > 0 ? "warning" : "success"} />
        <StatCard label="This week" value={weekCount} icon={Layers} />
        <StatCard label="Completed (7 days)" value={completedThisWeek} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            Today&apos;s roster — {formatDate(now, { weekday: "long", day: "numeric", month: "long" })}
          </CardTitle>
          <CardDescription>
            Record vitals before and after each procedure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No sessions today"
              description="Your roster is clear. Upcoming sessions are listed below."
            />
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-6">
              {todaySessions.map((s) => (
                <li key={s.id} className="relative">
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-[27px] top-4 size-2.5 rounded-full border-2 border-background bg-primary"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {initialsOf(
                            s.plan.patient.user.firstName,
                            s.plan.patient.user.lastName,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {s.plan.patient.user.firstName} {s.plan.patient.user.lastName}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {s.procedureName} · day {s.dayNumber} of {s.plan.totalDays}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {s.plan.patient.mrn}
                          {s.room && ` · ${s.room.name}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="font-medium tabular-nums">
                        {formatTime(s.scheduledStart)}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <PhaseBadge phase={s.phase} short />
                        <SessionStatusBadge status={s.status} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming up this week</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing else this week" />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {s.plan.patient.user.firstName} {s.plan.patient.user.lastName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.procedureName}
                      {s.room && ` · ${s.room.name}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">
                      {formatDate(s.scheduledStart, { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatTime(s.scheduledStart)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your certified procedures
        </p>
        <div className="flex flex-wrap gap-2">
          {profile.expertise.map((e) => (
            <Badge key={e} variant="secondary">
              {humanise(e)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
