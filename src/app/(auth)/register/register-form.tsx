"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { register } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            aria-invalid={Boolean(state?.errors?.firstName)}
            required
          />
          <FieldError messages={state?.errors?.firstName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            aria-invalid={Boolean(state?.errors?.lastName)}
            required
          />
          <FieldError messages={state?.errors?.lastName} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(state?.errors?.email)}
          required
        />
        <FieldError messages={state?.errors?.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">
          Mobile number{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="9876543210"
          aria-invalid={Boolean(state?.errors?.phone)}
        />
        <FieldError messages={state?.errors?.phone} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state?.errors?.password)}
          aria-describedby="password-hint"
          required
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          At least 8 characters, including a letter and a number.
        </p>
        <FieldError messages={state?.errors?.password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state?.errors?.confirmPassword)}
          required
        />
        <FieldError messages={state?.errors?.confirmPassword} />
      </div>

      <Button type="submit" className="w-full" size="lg" loading={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
