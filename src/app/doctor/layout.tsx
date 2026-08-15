import { RoleLayout } from "@/components/shell/role-layout";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="DOCTOR">{children}</RoleLayout>;
}
