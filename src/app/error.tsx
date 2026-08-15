"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where a Sentry/OpenTelemetry report would go.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The error has been logged. You can retry, and if it keeps happening
        please report it.
      </p>
      {error.digest && (
        <code className="mt-4 rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
          Reference: {error.digest}
        </code>
      )}
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </div>
  );
}
