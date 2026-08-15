import Link from "next/link";
import {
  CalendarDays,
  Activity,
  Sparkles,
  Sun,
  ArrowRight,
  Salad,
  CircleAlert,
} from "lucide-react";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PhaseBadge, SessionStatusBadge, PlanStatusBadge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/page";
import { Progress, Separator } from "@/components/ui/misc";
import { DoshaComparison, ProgressChart, type ProgressPoint } from "@/components/charts";
import { formatDate, formatTime, formatRelative, humanise } from "@/lib/utils";
import { compareToBaseline, DOSHA_META } from "@/lib/ayurveda/dosha";

export const metadata = { title: "Overview" };

export default async function PatientOverview() {
  const { user, profile } = await requirePatient();
  const now = new Date();

  const [activePlan, prakriti, vikriti, progressEntries, upcoming, todaySessions] =
    await Promise.all([
      db.therapyPlan.findFirst({
        where: { patientId: profile.id, status: { in: ["ACTIVE", "DRAFT"] } },
        orderBy: { startDate: "asc" },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          template: { select: { name: true } },
          _count: { select: { sessions: true } },
        },
      }),
      db.doshaAssessment.findFirst({
        where: { patientId: profile.id, type: "PRAKRITI" },
        orderBy: { createdAt: "desc" },
      }),
      db.doshaAssessment.findFirst({
        where: { patientId: profile.id, type: "VIKRITI" },
        orderBy: { createdAt: "desc" },
      }),
      db.progressEntry.findMany({
        where: { patientId: profile.id },
        orderBy: { recordedAt: "asc" },
        take: 20,
      }),
      db.therapySession.findMany({
        where: {
          plan: { patientId: profile.id },
          scheduledStart: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        orderBy: { scheduledStart: "asc" },
        take: 5,
        include: {
          room: { select: { name: true } },
          therapist: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      db.therapySession.findMany({
        where: {
          plan: { patientId: profile.id },
          scheduledStart: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
        orderBy: { scheduledStart: "asc" },
        include: { room: { select: { name: true } } },
      }),
    ]);

  const completedCount = activePlan
    ? await db.therapySession.count({
        where: { planId: activePlan.id, status: "COMPLETED" },
      })
    : 0;

  const totalSessions = activePlan?._count.sessions ?? 0;
  const completionPct =
    totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  const comparison =
    prakriti && vikriti
      ? compareToBaseline(
          { VATA: prakriti.vataScore, PITTA: prakriti.pittaScore, KAPHA: prakriti.kaphaScore },
          { VATA: vikriti.vataScore, PITTA: vikriti.pittaScore, KAPHA: vikriti.kaphaScore },
        )
      : null;

  const chartData: ProgressPoint[] = progressEntries.map((e) => ({
    date: formatDate(e.recordedAt, { day: "numeric", month: "short" }),
    symptomSeverity: e.symptomSeverity,
    energyLevel: e.energyLevel,
    sleepQuality: e.sleepQuality,
    digestion: e.digestion,
  }));

  const latest = progressEntries.at(-1);
  const first = progressEntries.at(0);
  const severityDrop =
    first && latest ? first.symptomSeverity - latest.symptomSeverity : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Namaste, ${user.firstName}`}
        description={
          activePlan
            ? `You are on day ${dayOfPlan(activePlan.startDate, now)} of ${activePlan.totalDays} — ${activePlan.template?.name ?? humanise(activePlan.therapyType)}.`
            : "You have no active therapy plan. Book a consultation to get started."
        }
        action={
          <Button asChild variant="outline">
            <Link href="/patient/schedule">
              Full schedule <ArrowRight />
            </Link>
          </Button>
        }
      />

      {/* Today */}
      <Card className="mb-6 border-primary/25 bg-primary/[0.03]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-accent" />
            <CardTitle className="text-base">Aaj ka nirdesh — today&apos;s instructions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No therapy session scheduled today. Keep to your prescribed diet
              and rest.
            </p>
          ) : (
            <ul className="space-y-3">
              {todaySessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.procedureName}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatTime(s.scheduledStart)} – {formatTime(s.scheduledEnd)}
                      {s.room && ` · ${s.room.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhaseBadge phase={s.phase} short />
                    <SessionStatusBadge status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-md bg-accent/10 p-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-muted-foreground">
              Come on an empty stomach for Purvakarma and Pradhanakarma
              procedures. Wear loose cotton clothing, and avoid cold water for
              two hours afterwards.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Plan progress"
          value={`${completionPct}%`}
          hint={`${completedCount} of ${totalSessions} sessions`}
          icon={Activity}
        />
        <StatCard
          label="Next session"
          value={upcoming[0] ? formatRelative(upcoming[0].scheduledStart) : "—"}
          hint={upcoming[0]?.procedureName ?? "Nothing scheduled"}
          icon={CalendarDays}
        />
        <StatCard
          label="Constitution"
          value={prakriti ? DOSHA_META[prakriti.dominant].name : "—"}
          hint={prakriti ? DOSHA_META[prakriti.dominant].elements : "Not assessed yet"}
          icon={Sparkles}
        />
        <StatCard
          label="Symptom severity"
          value={latest ? `${latest.symptomSeverity}/10` : "—"}
          hint={
            severityDrop && severityDrop > 0
              ? `Down ${severityDrop} points since starting`
              : "Log an entry to start tracking"
          }
          icon={Activity}
          tone={severityDrop && severityDrop > 0 ? "success" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Your progress</CardTitle>
            <CardDescription>
              Self-reported each session. Severity should fall as the others rise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 1 ? (
              <ProgressChart data={chartData} />
            ) : (
              <EmptyState
                icon={Activity}
                title="Not enough data yet"
                description="Your progress chart appears once you have logged a couple of sessions."
              />
            )}
          </CardContent>
        </Card>

        {/* Dosha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Constitution vs current state</CardTitle>
            <CardDescription>
              Treatment aims to bring the current reading back to your baseline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prakriti && vikriti ? (
              <>
                <DoshaComparison
                  prakriti={{
                    VATA: prakriti.vataScore,
                    PITTA: prakriti.pittaScore,
                    KAPHA: prakriti.kaphaScore,
                  }}
                  vikriti={{
                    VATA: vikriti.vataScore,
                    PITTA: vikriti.pittaScore,
                    KAPHA: vikriti.kaphaScore,
                  }}
                />
                {comparison?.primaryImbalance && (
                  <div className="mt-3 rounded-md bg-secondary p-3 text-sm">
                    <span className="font-medium">
                      {DOSHA_META[comparison.primaryImbalance.dosha].name}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      is {comparison.primaryImbalance.delta} points above your
                      baseline — this is what the current protocol targets.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Constitution not assessed"
                description="A short questionnaire establishes your Prakriti."
                action={
                  <Button asChild size="sm">
                    <Link href="/patient/constitution">Take the assessment</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan + upcoming */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current therapy plan</CardTitle>
          </CardHeader>
          <CardContent>
            {activePlan ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{humanise(activePlan.therapyType)}</Badge>
                  <PlanStatusBadge status={activePlan.status} />
                </div>
                <p className="text-sm font-medium">{activePlan.template?.name}</p>
                {activePlan.goals && (
                  <p className="text-sm text-muted-foreground">{activePlan.goals}</p>
                )}
                <Separator />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Prescribed by</dt>
                    <dd className="font-medium">
                      Dr. {activePlan.doctor.user.firstName}{" "}
                      {activePlan.doctor.user.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-medium">{activePlan.totalDays} days</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Started</dt>
                    <dd className="font-medium">{formatDate(activePlan.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ends</dt>
                    <dd className="font-medium">{formatDate(activePlan.endDate)}</dd>
                  </div>
                </dl>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Sessions completed</span>
                    <span className="tabular-nums">
                      {completedCount}/{totalSessions}
                    </span>
                  </div>
                  <Progress value={completionPct} />
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/patient/diet">
                    <Salad /> View diet &amp; lifestyle plan
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No active plan"
                description="Your doctor will prescribe a protocol after your consultation."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing scheduled" />
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.procedureName}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatDate(s.scheduledStart, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {formatTime(s.scheduledStart)}
                      </p>
                      {s.therapist && (
                        <p className="text-xs text-muted-foreground">
                          with {s.therapist.user.firstName} {s.therapist.user.lastName}
                          {s.room && ` · ${s.room.name}`}
                        </p>
                      )}
                    </div>
                    <PhaseBadge phase={s.phase} short />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function dayOfPlan(start: Date, now: Date): number {
  const days = Math.floor(
    (now.getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.max(1, days + 1);
}
