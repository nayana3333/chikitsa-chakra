import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/brand";

// A route-group layout has no URL segment of its own, so it isn't part of the
// generated `LayoutRoutes` union and takes plain props.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-chakra-grid flex min-h-screen flex-col">
      <div className="flex items-center justify-between p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}
