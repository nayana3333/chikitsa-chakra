"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { DOSHA_META } from "@/lib/ayurveda/dosha";
import type { Dosha } from "@/generated/prisma/enums";

/**
 * Charts are the one place this app must go client-side, so they are isolated
 * here and kept deliberately small — everything else stays a Server Component.
 */

const AXIS = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
};

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: "12px",
  color: "var(--card-foreground)",
};

/** Horizontal bars comparing the three doshas. */
export function DoshaBars({
  scores,
  height = 150,
}: {
  scores: { VATA: number; PITTA: number; KAPHA: number };
  height?: number;
}) {
  const data = (["VATA", "PITTA", "KAPHA"] as Dosha[]).map((d) => ({
    name: DOSHA_META[d].name,
    value: scores[d],
    fill: DOSHA_META[d].colorVar,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={56}
          tickLine={false}
          axisLine={false}
          tick={AXIS}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "var(--secondary)" }}
          formatter={(v) => [`${Number(v ?? 0)}%`, "Share"]}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Prakriti vs Vikriti — the comparison that shows treatment working. */
export function DoshaComparison({
  prakriti,
  vikriti,
  height = 190,
}: {
  prakriti: { VATA: number; PITTA: number; KAPHA: number };
  vikriti: { VATA: number; PITTA: number; KAPHA: number };
  height?: number;
}) {
  const data = (["VATA", "PITTA", "KAPHA"] as Dosha[]).map((d) => ({
    name: DOSHA_META[d].name,
    Constitution: prakriti[d],
    Current: vikriti[d],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} unit="%" />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Constitution" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} barSize={18} />
        <Bar dataKey="Current" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface ProgressPoint {
  date: string;
  symptomSeverity: number;
  energyLevel: number;
  sleepQuality: number;
  digestion: number;
}

/**
 * Patient-reported outcomes over a plan. Severity is plotted alongside the
 * positive measures deliberately: seeing severity fall while energy and sleep
 * rise is the whole story of a successful course of treatment in one glance.
 */
export function ProgressChart({
  data,
  height = 260,
}: {
  data: ProgressPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -22, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={AXIS} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="symptomSeverity"
          name="Symptom severity"
          stroke="var(--pitta)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="energyLevel"
          name="Energy"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="sleepQuality"
          name="Sleep"
          stroke="var(--vata)"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="digestion"
          name="Digestion"
          stroke="var(--kapha)"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Single-value radial gauge — plan completion, utilisation, adherence. */
export function Gauge({
  value,
  label,
  height = 150,
}: {
  value: number;
  label: string;
  height?: number;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          data={[{ name: label, value }]}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} fill="var(--primary)" background={{ fill: "var(--secondary)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl font-semibold tabular-nums">
          {value}%
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Weekly session volume for the admin overview. */
export function SessionVolumeChart({
  data,
  height = 240,
}: {
  data: { day: string; completed: number; scheduled: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -24, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="completed" name="Completed" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="scheduled" name="Upcoming" stackId="a" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
