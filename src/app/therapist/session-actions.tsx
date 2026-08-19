"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { completeTherapySession, markSessionMissed } from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/misc";

/**
 * The therapist-facing action cluster for a session that hasn't happened yet.
 * "Complete" is the path that matters — it runs the material-consumption
 * transaction in src/app/actions/sessions.ts; "Mark missed" is a one-click
 * status change with no inventory effect.
 *
 * Both actions are called directly and awaited in an event handler rather
 * than through useActionState — closing the dialog and toasting on success
 * are then just the next lines after the await, with no effect needed to
 * react to a result after the fact.
 */
export function SessionActions({
  sessionId,
  procedureName,
}: {
  sessionId: string;
  procedureName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleComplete(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await completeTherapySession(sessionId, formData);
      if (result.status === "success") {
        toast.success(`${procedureName} marked complete.`);
        setOpen(false);
      } else if (result.status === "error") {
        setError(result.message);
      }
    });
  }

  async function handleMissed() {
    const result = await markSessionMissed(sessionId);
    if (result.status === "success") {
      toast.success(`${procedureName} marked as missed.`);
    } else if (result.status === "error") {
      toast.error(result.message);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" variant="default">
            <CheckCircle2 /> Complete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete session</DialogTitle>
            <DialogDescription>
              {procedureName}. Recording this deducts the materials this
              procedure uses from stock.
            </DialogDescription>
          </DialogHeader>

          <form action={handleComplete} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bp">Blood pressure</Label>
                <Input id="bp" name="bp" placeholder="120/80" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pulse">Pulse (bpm)</Label>
                <Input id="pulse" name="pulse" type="number" placeholder="72" />
              </div>
            </div>
            <FieldError messages={error ? [error] : undefined} />
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="How the patient tolerated the procedure, anything to flag for the doctor…"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={pending}>
                {pending ? "Saving…" : "Mark complete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button size="sm" variant="ghost" onClick={handleMissed}>
        <XCircle /> Missed
      </Button>
    </div>
  );
}
