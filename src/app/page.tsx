import Link from "next/link";
import {
  CalendarCheck,
  Sparkles,
  LineChart,
  Boxes,
  ShieldCheck,
  Bot,
  ArrowRight,
} from "lucide-react";
import { Logo, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOptionalUser, dashboardPathFor } from "@/lib/auth/dal";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Prakriti & Vikriti assessment",
    body: "A weighted questionnaire scores Vata, Pitta and Kapha to establish the patient's innate constitution, then tracks current imbalance separately so you can see treatment actually moving the needle.",
  },
  {
    icon: CalendarCheck,
    title: "Phase-aware scheduling",
    body: "Panchakarma runs Purvakarma → Pradhanakarma → Paschatkarma. The scheduler understands that sequence, honours mandated rest days, and refuses to double-book a therapist or a therapy room.",
  },
  {
    icon: LineChart,
    title: "Outcome tracking",
    body: "Symptom severity, energy, sleep, digestion and mood are captured each session and plotted across the plan, turning subjective progress into something you can show a patient.",
  },
  {
    icon: Boxes,
    title: "Inventory with batch & expiry",
    body: "Medicated oils and herbs are tracked by batch. Completing a session draws down stock automatically, and expiring batches surface before they are used on a patient.",
  },
  {
    icon: Bot,
    title: "AI clinical assistant",
    body: "Drafts therapy protocols from a diagnosis, triages reported symptoms against dosha patterns, and answers patient questions with clear scope limits about what it cannot advise on.",
  },
  {
    icon: ShieldCheck,
    title: "Auditable by design",
    body: "Signed httpOnly sessions, role-based access enforced next to the data rather than in the UI, and an append-only audit trail over every clinical record change.",
  },
];

const THERAPIES = [
  "Vamana",
  "Virechana",
  "Basti",
  "Nasya",
  "Raktamokshana",
  "Abhyanga",
  "Shirodhara",
  "Swedana",
];

export default async function LandingPage() {
  const user = await getOptionalUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild>
                <Link href={dashboardPathFor(user.role)}>
                  Go to dashboard <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-chakra-grid relative overflow-hidden border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-5">
                Smart India Hackathon · SIH25023
              </Badge>
              <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Panchakarma care,{" "}
                <span className="text-primary">run properly.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Most clinic software treats Ayurveda as generic appointment
                booking with different words. Chikitsa Chakra models the
                thing itself — constitution, the three treatment phases, rest
                days, contraindications, and the medicated materials each
                procedure consumes.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/login">
                    Explore the demo <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">See what it does</Link>
                </Button>
              </div>

              <div className="mt-12 flex flex-wrap gap-2">
                {THERAPIES.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Built around the clinical workflow
            </h2>
            <p className="mt-4 text-muted-foreground">
              Four roles, one record. A doctor prescribes a protocol, the
              scheduler lays it out across the calendar, therapists execute and
              log each session, and the patient sees their own progress.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-5">
                  <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mb-2 font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              One record, four viewpoints
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  role: "Patient",
                  body: "Today's instructions, upcoming sessions, dosha profile, diet guidance, and a progress chart that makes an abstract treatment feel concrete.",
                },
                {
                  role: "Doctor",
                  body: "Patient queue, consultation notes, constitution assessment, and protocol prescribing with contraindication checks recorded at the point of decision.",
                },
                {
                  role: "Therapist",
                  body: "A daily roster, per-session vitals capture before and after each procedure, materials consumed, and reschedule requests.",
                },
                {
                  role: "Administrator",
                  body: "Room and therapist utilisation, revenue, stock levels and expiry alerts, staff management, and the full audit trail.",
                },
              ].map((r) => (
                <div key={r.role}>
                  <h3 className="mb-2 font-semibold text-primary">{r.role}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {r.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Sign in with a demo account
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Every role is seeded with realistic data — patients mid-treatment,
            therapists with full calendars, stock that is about to expire.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login">
              Open the demo <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo size={28} />
          <p>
            Problem Statement SIH25023 · Panchakarma Patient Management &amp;
            Therapy Scheduling
          </p>
        </div>
      </footer>
    </div>
  );
}
