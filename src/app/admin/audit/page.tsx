import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export default async function AdminAudit() {
  await requireRole("ADMIN");

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { firstName: true, lastName: true, role: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Audit log"
        description="Append-only record of who did what. Rows are never edited or deleted — a correction is a new entry, not an overwrite."
      />

      <Card>
        <CardContent className="px-0 pt-5">
          {logs.length === 0 ? (
            <div className="px-5">
              <EmptyState icon={ShieldCheck} title="Nothing recorded yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Source</TH>
                </tr>
              </THead>
              <tbody>
                {logs.map((log) => (
                  <TR key={log.id}>
                    <TD className="whitespace-nowrap">
                      <p className="text-sm">{formatDate(log.createdAt)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatTime(log.createdAt)}
                      </p>
                    </TD>
                    <TD>
                      {log.actor ? (
                        <>
                          <p className="text-sm font-medium">
                            {log.actor.firstName} {log.actor.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.actor.role.toLowerCase()}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">System</span>
                      )}
                    </TD>
                    <TD>
                      <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                        {log.action}
                      </code>
                    </TD>
                    <TD>
                      <Badge variant="outline">{log.entity}</Badge>
                    </TD>
                    <TD className="text-xs tabular-nums text-muted-foreground">
                      {log.ip ?? "—"}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
