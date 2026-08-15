import Link from "next/link";
import {
  Users,
  IndianRupee,
  CalendarCheck,
  TriangleAlert,
  Boxes,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, InvoiceStatusBadge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/page";
import { Gauge, SessionVolumeChart } from "@/components/charts";
import { formatCurrency, formatDate, formatRelative } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireRole("ADMIN");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(startOfToday.getTime() - 6 * 86400000);
  const weekAhead = new Date(startOfToday.getTime() + 7 * 86400000);
  const monthAgo = new Date(startOfToday.getTime() - 30 * 86400000);

  const [
    patientCount,
    staffCount,
    activePlans,
    sessionsToday,
    sessionWindow,
    invoices,
    batches,
    items,
    recentAudit,
  ] = await Promise.all([
    db.patientProfile.count(),
    db.user.count({ where: { role: { in: ["DOCTOR", "THERAPIST"] } } }),
    db.therapyPlan.count({ where: { status: "ACTIVE" } }),
    db.therapySession.count({
      where: {
        scheduledStart: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 86400000) },
      },
    }),
    db.therapySession.findMany({
      where: { scheduledStart: { gte: weekAgo, lt: weekAhead } },
      select: { scheduledStart: true, status: true },
    }),
    db.invoice.findMany({
      where: { issuedAt: { gte: monthAgo } },
      orderBy: { issuedAt: "desc" },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    db.inventoryBatch.findMany({
      where: { expiryDate: { lte: new Date(now.getTime() + 45 * 86400000) } },
      orderBy: { expiryDate: "asc" },
      include: { item: { select: { name: true, unit: true } } },
      take: 6,
    }),
    db.inventoryItem.findMany({
      include: { batches: { select: { quantity: true } } },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  // Revenue actually collected, not merely invoiced.
  const collected = invoices.reduce((sum, i) => sum + Number(i.amountPaid), 0);
  const billed = invoices.reduce((sum, i) => sum + Number(i.total), 0);
  const outstanding = billed - collected;
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;

  const lowStock = items.filter((item) => {
    const onHand = item.batches.reduce((s, b) => s + Number(b.quantity), 0);
    return onHand < Number(item.reorderLevel);
  });

  // Bucket the two-week session window by day for the volume chart.
  const volume: { day: string; completed: number; scheduled: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const day = new Date(weekAgo.getTime() + i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    const inDay = sessionWindow.filter(
      (s) => s.scheduledStart >= day && s.scheduledStart < next,
    );
    volume.push({
      day: formatDate(day, { day: "numeric", month: "short" }),
      completed: inDay.filter((s) => s.status === "COMPLETED").length,
      scheduled: inDay.filter((s) => s.status !== "COMPLETED").length,
    });
  }

  const unpaid = invoices
    .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Clinic overview"
        description="Operations, revenue, and stock health across the practice."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/analytics">
              Full analytics <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered patients" value={patientCount} icon={Users} />
        <StatCard label="Sessions today" value={sessionsToday} icon={CalendarCheck} />
        <StatCard
          label="Collected (30 days)"
          value={formatCurrency(collected)}
          hint={`${formatCurrency(outstanding)} outstanding`}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="Stock alerts"
          value={lowStock.length + batches.length}
          hint={`${lowStock.length} low · ${batches.length} expiring`}
          icon={TriangleAlert}
          tone={lowStock.length + batches.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Session volume</CardTitle>
            <CardDescription>Past week and the week ahead.</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionVolumeChart data={volume} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collection rate</CardTitle>
            <CardDescription>Paid against billed, last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <Gauge value={collectionRate} label="collected" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billed</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(billed)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Outstanding</dt>
                <dd className="font-medium tabular-nums text-destructive">
                  {formatCurrency(outstanding)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Active plans</dt>
                <dd className="font-medium tabular-nums">{activePlans}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Clinical staff</dt>
                <dd className="font-medium tabular-nums">{staffCount}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding invoices</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {unpaid.length === 0 ? (
              <div className="px-5">
                <EmptyState icon={IndianRupee} title="Everything settled" />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Invoice</TH>
                    <TH>Patient</TH>
                    <TH className="text-right">Due</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <tbody>
                  {unpaid.map((inv) => (
                    <TR key={inv.id}>
                      <TD className="font-medium">{inv.invoiceNo}</TD>
                      <TD className="text-muted-foreground">
                        {inv.patient.user.firstName} {inv.patient.user.lastName}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {formatCurrency(Number(inv.total) - Number(inv.amountPaid))}
                      </TD>
                      <TD>
                        <InvoiceStatusBadge status={inv.status} />
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock needing attention</CardTitle>
            <CardDescription>
              Batches expiring within 45 days, and items below reorder level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batches.length === 0 && lowStock.length === 0 ? (
              <EmptyState icon={Boxes} title="Stock is healthy" />
            ) : (
              <ul className="space-y-2.5">
                {batches.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Batch {b.batchNo} · {Number(b.quantity)} {b.item.unit}
                      </p>
                    </div>
                    <Badge variant="warning">
                      Expires {formatRelative(b.expiryDate)}
                    </Badge>
                  </li>
                ))}
                {lowStock.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.batches.reduce((s, b) => s + Number(b.quantity), 0)}{" "}
                        {item.unit} on hand · reorder at {Number(item.reorderLevel)}
                      </p>
                    </div>
                    <Badge variant="destructive">Low stock</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <CardTitle className="text-base">Recent activity</CardTitle>
          </div>
          <CardDescription>
            Append-only audit trail over clinical and financial records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAudit.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No activity recorded yet" />
          ) : (
            <ul className="divide-y divide-border">
              {recentAudit.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                      {log.action}
                    </code>
                    <span className="ml-2 text-sm text-muted-foreground">
                      on {log.entity}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {log.actor
                      ? `${log.actor.firstName} ${log.actor.lastName}`
                      : "System"}{" "}
                    · {formatRelative(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
