import type { Role } from "@/generated/prisma/enums";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Sparkles,
  Boxes,
  ShieldCheck,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

/**
 * Navigation is derived from role rather than filtered in the component, so a
 * link a role shouldn't see is never rendered in the first place. The proxy and
 * the DAL still enforce access — this only shapes the UI.
 */
export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  PATIENT: [
    {
      items: [
        { href: "/patient", label: "Overview", icon: LayoutDashboard },
        { href: "/patient/schedule", label: "My Schedule", icon: CalendarDays },
      ],
    },
    {
      heading: "Care",
      items: [
        { href: "/patient/constitution", label: "My Constitution", icon: Sparkles },
        { href: "/patient/assistant", label: "Ask Ayurveda", icon: MessageCircle },
      ],
    },
  ],

  DOCTOR: [
    {
      items: [
        { href: "/doctor", label: "Overview", icon: LayoutDashboard },
        { href: "/doctor/patients", label: "Patients", icon: Users },
      ],
    },
  ],

  THERAPIST: [
    {
      items: [{ href: "/therapist", label: "Today", icon: LayoutDashboard }],
    },
  ],

  ADMIN: [
    {
      items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
    },
    {
      heading: "Operations",
      items: [
        { href: "/admin/inventory", label: "Inventory", icon: Boxes },
      ],
    },
    {
      heading: "Governance",
      items: [{ href: "/admin/audit", label: "Audit Log", icon: ShieldCheck }],
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  PATIENT: "Patient",
  DOCTOR: "Doctor",
  THERAPIST: "Therapist",
  ADMIN: "Administrator",
};
