import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand";
import { DemoAccounts } from "../demo-accounts";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo size={44} />
      </div>

      <h1 className="text-center font-serif text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Sign in to your Chikitsa Chakra workspace.
      </p>

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Register as a patient
        </Link>
      </p>

      <DemoAccounts />
    </div>
  );
}
