import { Users } from "lucide-react";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, DoshaBadge, PlanStatusBadge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/misc";
import { formatDate, humanise, initialsOf } from "@/lib/utils";

export const metadata = { title: "Patients" };

export default async function DoctorPatients() {
  const { profile } = await requireDoctor();

  // Only patients this doctor has actually seen — a doctor should not be able
  // to browse the whole clinic's records from here.
  const patients = await db.patientProfile.findMany({
    where: { consultations: { some: { doctorId: profile.id } } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      assessments: {
        where: { type: "VIKRITI" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      therapyPlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, therapyType: true, startDate: true },
      },
      _count: { select: { consultations: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Patients"
        description={`${patients.length} patient${patients.length === 1 ? "" : "s"} under your care.`}
      />

      <Card>
        <CardContent className="px-0 pt-5">
          {patients.length === 0 ? (
            <div className="px-5">
              <EmptyState icon={Users} title="No patients yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Patient</TH>
                  <TH>Age</TH>
                  <TH>Imbalance</TH>
                  <TH>Latest plan</TH>
                  <TH>Visits</TH>
                </tr>
              </THead>
              <tbody>
                {patients.map((p) => {
                  const plan = p.therapyPlans[0];
                  const vikriti = p.assessments[0];
                  return (
                    <TR key={p.id}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              {initialsOf(p.user.firstName, p.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {p.user.firstName} {p.user.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.mrn}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD className="text-muted-foreground tabular-nums">
                        {p.dateOfBirth ? ageOf(p.dateOfBirth) : "—"}
                      </TD>
                      <TD>
                        {vikriti ? <DoshaBadge dosha={vikriti.dominant} /> : "—"}
                      </TD>
                      <TD>
                        {plan ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary">
                              {humanise(plan.therapyType)}
                            </Badge>
                            <PlanStatusBadge status={plan.status} />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(plan.startDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TD>
                      <TD className="tabular-nums text-muted-foreground">
                        {p._count.consultations}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ageOf(dob: Date): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
