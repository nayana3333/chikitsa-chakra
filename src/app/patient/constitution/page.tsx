import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, DoshaBadge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/misc";
import { DoshaBars, DoshaComparison } from "@/components/charts";
import { AssessmentForm } from "./assessment-form";
import { DOSHA_META, compareToBaseline } from "@/lib/ayurveda/dosha";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My constitution" };

export default async function ConstitutionPage() {
  const { profile } = await requirePatient();

  const [prakriti, vikriti] = await Promise.all([
    db.doshaAssessment.findFirst({
      where: { patientId: profile.id, type: "PRAKRITI" },
      orderBy: { createdAt: "desc" },
    }),
    db.doshaAssessment.findFirst({
      where: { patientId: profile.id, type: "VIKRITI" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const toScores = (a: typeof prakriti) =>
    a ? { VATA: a.vataScore, PITTA: a.pittaScore, KAPHA: a.kaphaScore } : null;

  const p = toScores(prakriti);
  const v = toScores(vikriti);
  const comparison = p && v ? compareToBaseline(p, v) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Your constitution"
        description="Prakriti is the balance of doshas you were born with — it does not change. Vikriti is where you are right now. The distance between them is what treatment works on."
      />

      {p && (
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prakriti — your baseline</CardTitle>
              <CardDescription>
                Assessed {formatDate(prakriti!.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <DoshaBadge dosha={prakriti!.dominant} />
                {prakriti!.secondary && (
                  <>
                    <span className="text-xs text-muted-foreground">with</span>
                    <DoshaBadge dosha={prakriti!.secondary} />
                  </>
                )}
              </div>
              <DoshaBars scores={p} />
              <div className="mt-4 space-y-1.5 text-sm">
                <p className="font-medium">
                  {DOSHA_META[prakriti!.dominant].name} —{" "}
                  {DOSHA_META[prakriti!.dominant].elements}
                </p>
                <p className="text-muted-foreground">
                  {DOSHA_META[prakriti!.dominant].qualities}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Baseline vs current</CardTitle>
              <CardDescription>
                {v
                  ? "How far your current state has drifted from your constitution."
                  : "Take the current-state assessment to see the comparison."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {v ? (
                <>
                  <DoshaComparison prakriti={p} vikriti={v} height={210} />
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {comparison!.deviations.map((d) => (
                      <div
                        key={d.dosha}
                        className="rounded-lg border border-border p-3 text-center"
                      >
                        <p className="text-xs text-muted-foreground">
                          {DOSHA_META[d.dosha].name}
                        </p>
                        <p className="mt-0.5 font-serif text-lg font-semibold tabular-nums">
                          {d.delta > 0 ? "+" : ""}
                          {d.delta}
                        </p>
                        <Badge
                          variant={
                            d.status === "AGGRAVATED"
                              ? "warning"
                              : d.status === "DEPLETED"
                                ? "secondary"
                                : "success"
                          }
                          className="mt-1.5"
                        >
                          {d.status.toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No current-state reading recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Take an assessment</CardTitle>
          <CardDescription>
            Sixteen questions. Answer as you have been over most of your life
            for Prakriti, or as you have felt over the last few weeks for
            Vikriti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={p ? "VIKRITI" : "PRAKRITI"}>
            <TabsList>
              <TabsTrigger value="PRAKRITI">Prakriti — lifelong</TabsTrigger>
              <TabsTrigger value="VIKRITI">Vikriti — recent weeks</TabsTrigger>
            </TabsList>
            <TabsContent value="PRAKRITI">
              <AssessmentForm type="PRAKRITI" />
            </TabsContent>
            <TabsContent value="VIKRITI">
              <AssessmentForm type="VIKRITI" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
