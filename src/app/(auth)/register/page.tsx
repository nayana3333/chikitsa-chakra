import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Logo } from "@/components/brand";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo size={44} />
      </div>

      <h1 className="text-center font-serif text-2xl font-semibold tracking-tight">
        Create your patient account
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Clinical staff accounts are created by an administrator.
      </p>

      <div className="mt-8">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
