import { RoleLayout } from "@/components/shell/role-layout";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="PATIENT">{children}</RoleLayout>;
}
