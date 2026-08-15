import { Card, CardContent } from "@/components/ui/card";

/**
 * The seed script creates one account per role with this shared password.
 * Surfacing them on the login page means a reviewer can get into every part of
 * the app in seconds without reading the README first.
 */
const ACCOUNTS = [
  { role: "Patient", email: "patient@chikitsa.dev" },
  { role: "Doctor", email: "doctor@chikitsa.dev" },
  { role: "Therapist", email: "therapist@chikitsa.dev" },
  { role: "Admin", email: "admin@chikitsa.dev" },
];

export function DemoAccounts() {
  return (
    <Card className="mt-8 border-dashed bg-secondary/40">
      <CardContent className="pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Demo accounts
        </p>
        <ul className="space-y-1.5 text-sm">
          {ACCOUNTS.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{a.role}</span>
              <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                {a.email}
              </code>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Password for all four:{" "}
          <code className="rounded bg-background px-1.5 py-0.5">
            Chikitsa@2026
          </code>
        </p>
      </CardContent>
    </Card>
  );
}
