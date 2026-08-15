import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier ones
 * that target the same property (so `cn("p-2", "p-4")` yields `p-4`, which
 * plain string concatenation would not).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Accepts Prisma Decimal, number, or string. */
export function formatCurrency(value: unknown): string {
  return INR.format(Number(value ?? 0));
}

export function formatDate(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", opts).format(new Date(date));
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/** "in 3 days", "2 hours ago" — for activity feeds and session countdowns. */
export function formatRelative(date: Date | string): string {
  const target = new Date(date).getTime();
  const diffMs = target - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return "just now";
}

/** Minutes-from-midnight → "9:30 AM". Used by the availability editor. */
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function initialsOf(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Title-cases an enum member: "KATI_BASTI" → "Kati Basti". */
export function humanise(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
