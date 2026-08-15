import Link from "next/link";
import { Users, Stethoscope, ClipboardList, TrendingDown, ArrowRight } from "lucide-react";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PlanStatusBadge, DoshaBadge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/page";
import { formatDate, humanise, initialsOf } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/misc";

export const metadata = { title: "Overview" };

export default async function DoctorOverview() {
  const { user, profile } = await requireDoctor();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);

  const [
    patientCount,
    activePlans,
    todayConsultations,
    upcomingConsultations,
    recentPlans,
    improving,
  ] = await Promise.all([
    db.consultation
      .findMany({
        where: { doctorId: profile.id },
        select: { patientId: true },
        distinct: ["patientId"],
      })
      .then((r) => r.length),

    db.therapyPlan.count({
      where: { doctorId: profile.id, status: "ACTIVE" },
    }),

    db.consultation.count({
      where: {
        doctorId: profile.id,
        scheduledAt: { gte: startOfToday, lt: endOfToday },
      },
    }),

    db.consultation.findMany({
      where: {
        doctorId: profile.id,
        status: { in: ["REQUESTED", "SCHEDULED"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }),

    db.therapyPlan.findMany({
      where: { doctorId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            assessments: {
              where: { type: "VIKRITI" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        _count: { select: { sessions: true } },
      },
    }),

    // Patients whose latest self-report is better than their first — the
    // "treatment is working" list.
    db.therapyPlan.findMany({
      where: { doctorId: profile.id, status: { in: ["ACTIVE", "COMPLETED"] } },
      select: {
        id: true,
        patient: {
          select: { id: true, user: { select: { firstName: true, lastName: true } } },
        },
        progress: {
          orderBy: { recordedAt: "asc" },
          select: { symptomSeverity: true, recordedAt: true },
        },
      },
      take: 40,
    }),
  ]);

  const improvements = improving
    .filter((p) => p.progress.length >= 2)
    .map((p) => ({
      name: `${p.patient.user.firstName} ${p.patient.user.lastName}`,
      drop: p.progress[0].symptomSeverity - p.progress[p.progress.length - 1].symptomSeverity,
      from: p.progress[0].symptomSeverity,
      to: p.progress[p.progress.length - 1].symptomSeverity,
    }))
    .filter((p) => p.drop > 0)
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Dr. ${user.lastName}`}
        description="Your caseload at a glance — consultations due, plans running, and how patients are responding."
        action={
          <Button asChild>
            <Link href="/doctor/patients">
              All patients <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patients seen" value={patientCount} icon={Users} />
        <StatCard label="Active therapy plans" value={activePlans} icon={ClipboardList} tone="success" />
        <StatCard label="Consultations today" value={todayConsultations} icon={Stethoscope} />
        <StatCard
          label="Patients improving"
          value={improvements.length}
          hint="Severity down since starting"
          icon={TrendingDown}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent therapy plans</CardTitle>
            <CardDescription>Protocols you have prescribed, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {recentPlans.length === 0 ? (
              <div className="px-5">
                <EmptyState icon={ClipboardList} title="No plans prescribed yet" />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Patient</TH>
                    <TH>Therapy</TH>
                    <TH>Imbalance</TH>
                    <TH>Started</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <tbody>
                  {recentPlans.map((plan) => {
                    const vikriti = plan.patient.assessments[0];
                    return (
                      <TR key={plan.id}>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback>
                                {initialsOf(
                                  plan.patient.user.firstName,
                                  plan.patient.user.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {plan.patient.user.firstName} {plan.patient.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {plan.patient.mrn}
                              </p>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <Badge variant="secondary">{humanise(plan.therapyType)}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {plan._count.sessions} sessions
                          </p>
                        </TD>
                        <TD>
                          {vikriti ? <DoshaBadge dosha={vikriti.dominant} /> : "—"}
                        </TD>
                        <TD className="text-muted-foreground">
                          {formatDate(plan.startDate)}
                        </TD>
                        <TD>
                          <PlanStatusBadge status={plan.status} />
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming consultations</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingConsultations.length === 0 ? (
                <EmptyState icon={Stethoscope} title="Nothing booked" />
              ) : (
                <ul className="space-y-2.5">
                  {upcomingConsultations.map((c) => (
                    <li key={c.id} className="rounded-lg border border-border p-3">
                      <p className="font-medium">
                        {c.patient.user.firstName} {c.patient.user.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(c.scheduledAt, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      {c.chiefComplaint && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {c.chiefComplaint}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Responding best</CardTitle>
              <CardDescription>Largest drop in reported severity.</CardDescription>
            </CardHeader>
            <CardContent>
              {improvements.length === 0 ? (
                <EmptyState icon={TrendingDown} title="No outcome data yet" />
              ) : (
                <ul className="space-y-3">
                  {improvements.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm">{p.name}</span>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {p.from} → <span className="font-semibold text-success">{p.to}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
