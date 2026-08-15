import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Rendered when the DAL calls `forbidden()` — an authenticated user reaching
 * for something their role doesn't cover. Distinct from the login redirect,
 * which would misleadingly suggest they are signed out.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        You don&apos;t have access to this
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Your account is signed in, but this area belongs to a different role.
        If you believe this is wrong, ask an administrator to check your
        permissions.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
