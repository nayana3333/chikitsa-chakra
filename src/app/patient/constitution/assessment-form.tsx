"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { submitAssessment, type AssessmentState } from "@/app/actions/assessment";
import {
  DOSHA_QUESTIONS,
  CATEGORY_LABEL,
  type QuestionCategory,
} from "@/lib/ayurveda/questions";
import { scoreAssessment } from "@/lib/ayurveda/dosha";
import type { Dosha, AssessmentType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { DoshaBars } from "@/components/charts";
import { cn } from "@/lib/utils";

const CATEGORIES: QuestionCategory[] = [
  "PHYSICAL",
  "PHYSIOLOGICAL",
  "PSYCHOLOGICAL",
];

export function AssessmentForm({ type }: { type: AssessmentType }) {
  const [answers, setAnswers] = React.useState<Record<string, Dosha>>({});
  const [state, formAction, pending] = useActionState<AssessmentState, FormData>(
    submitAssessment,
    { status: "idle" },
  );

  const answered = Object.keys(answers).length;
  const total = DOSHA_QUESTIONS.length;
  const pct = Math.round((answered / total) * 100);

  // A live preview using the same scoring function the server uses. It's only
  // a preview — the stored result is always computed server-side.
  const preview = React.useMemo(() => scoreAssessment(answers), [answers]);

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(`Assessment saved — ${state.constitution}`);
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  const firstUnanswered = DOSHA_QUESTIONS.find((q) => !answers[q.id]);

  if (state.status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="font-serif text-2xl font-semibold">
            {state.constitution}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your assessment has been saved and is now visible to your doctor.
            It appears on your dashboard alongside your current readings.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            <RotateCcw /> Take it again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      {/* The whole submission travels as one JSON field so the Server Action
          can validate it as a single typed object rather than reassembling
          sixteen loose form keys. */}
      <input
        type="hidden"
        name="payload"
        value={JSON.stringify({ type, responses: answers })}
      />

      {/* Sticky progress */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:-mx-6 lg:px-6">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium">
            {answered} of {total} answered
          </span>
          <span className="text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {CATEGORIES.map((category) => {
            const questions = DOSHA_QUESTIONS.filter(
              (q) => q.category === category,
            );
            return (
              <section key={category}>
                <h2 className="mb-4 font-serif text-lg font-semibold">
                  {CATEGORY_LABEL[category]}
                </h2>
                <div className="space-y-4">
                  {questions.map((q) => (
                    <fieldset
                      key={q.id}
                      className={cn(
                        "rounded-xl border p-4 transition-colors",
                        answers[q.id]
                          ? "border-primary/30 bg-primary/[0.03]"
                          : "border-border",
                        firstUnanswered?.id === q.id &&
                          state.status === "error" &&
                          "border-destructive",
                      )}
                    >
                      <legend className="px-1 text-sm font-medium">
                        {q.prompt}
                      </legend>
                      <div className="mt-3 grid gap-2">
                        {q.options.map((opt) => {
                          const selected = answers[q.id] === opt.dosha;
                          return (
                            <label
                              key={opt.dosha}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                                selected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-secondary",
                              )}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt.dosha}
                                checked={selected}
                                onChange={() =>
                                  setAnswers((a) => ({ ...a, [q.id]: opt.dosha }))
                                }
                                className="mt-0.5 size-4 accent-[var(--primary)]"
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-40 space-y-4">
            <Card>
              <CardContent className="pt-5">
                <p className="mb-1 text-sm font-medium">Live reading</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Updates as you answer. The saved result is recalculated on
                  the server.
                </p>

                {answered === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Answer a question to begin.
                  </p>
                ) : (
                  <>
                    <DoshaBars scores={preview.percentages} />
                    <div className="mt-4 rounded-lg bg-secondary p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Current reading
                      </p>
                      <p className="font-serif text-lg font-semibold">
                        {preview.constitutionName}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {state.status === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={pending}
              disabled={answered < total}
            >
              {answered < total
                ? `${total - answered} question${total - answered === 1 ? "" : "s"} left`
                : "Save assessment"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
