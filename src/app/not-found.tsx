import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="size-7" />
      </div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The link may be out of date, or the record may have been removed.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
