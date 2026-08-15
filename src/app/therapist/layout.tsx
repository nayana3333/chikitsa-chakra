import { RoleLayout } from "@/components/shell/role-layout";

export default function TherapistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="THERAPIST">{children}</RoleLayout>;
}
