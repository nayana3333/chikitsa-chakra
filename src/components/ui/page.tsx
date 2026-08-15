import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/12 text-destructive",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              toneClass,
            )}
          >
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* Minimal table primitives — enough structure for consistent data tables
   without pulling in a full table library for what is mostly static markup. */

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("[&_th]:border-b [&_th]:border-border", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-secondary/50",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}
