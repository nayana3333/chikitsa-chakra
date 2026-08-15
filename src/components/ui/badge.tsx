import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type {
  SessionStatus,
  PlanStatus,
  InvoiceStatus,
  TherapyPhase,
  Dosha,
} from "@/generated/prisma/enums";
import { humanise } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-success/12 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        destructive: "border-transparent bg-destructive/12 text-destructive",
        muted: "border-transparent bg-muted text-muted-foreground",
        vata: "border-transparent bg-vata/12 text-vata",
        pitta: "border-transparent bg-pitta/12 text-pitta",
        kapha: "border-transparent bg-kapha/12 text-kapha",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/* ── Domain-aware badges ──────────────────────────────────────
   Keeping the status→colour mapping in one place stops the same
   status being green on one screen and grey on another. */

const SESSION_VARIANT: Record<
  SessionStatus,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  MISSED: "destructive",
  CANCELLED: "muted",
  RESCHEDULED: "outline",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <Badge variant={SESSION_VARIANT[status]}>{humanise(status)}</Badge>;
}

const PLAN_VARIANT: Record<
  PlanStatus,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  DRAFT: "muted",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge variant={PLAN_VARIANT[status]}>{humanise(status)}</Badge>;
}

const INVOICE_VARIANT: Record<
  InvoiceStatus,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  DRAFT: "muted",
  SENT: "secondary",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "muted",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={INVOICE_VARIANT[status]}>{humanise(status)}</Badge>;
}

const PHASE_LABEL: Record<TherapyPhase, string> = {
  PURVAKARMA: "Purvakarma · preparation",
  PRADHANAKARMA: "Pradhanakarma · main",
  PASCHATKARMA: "Paschatkarma · aftercare",
};

export function PhaseBadge({
  phase,
  short = false,
}: {
  phase: TherapyPhase;
  short?: boolean;
}) {
  const variant =
    phase === "PURVAKARMA"
      ? "secondary"
      : phase === "PRADHANAKARMA"
        ? "default"
        : "outline";
  return (
    <Badge variant={variant}>
      {short ? humanise(phase) : PHASE_LABEL[phase]}
    </Badge>
  );
}

export function DoshaBadge({ dosha }: { dosha: Dosha }) {
  const variant = dosha.toLowerCase() as "vata" | "pitta" | "kapha";
  return <Badge variant={variant}>{humanise(dosha)}</Badge>;
}

export { Badge, badgeVariants };
