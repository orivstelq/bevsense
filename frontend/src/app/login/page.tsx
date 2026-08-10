import type { Metadata } from "next";
import Link from "next/link";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { LoginForm } from "@/features/auth/login-form";
import {
  getHumanAuthEnabled,
  getSupabaseAuthConfiguration,
} from "@/lib/auth/auth-environment";

export const metadata: Metadata = { title: "Sign In | BevSense" };

export default function LoginPage() {
  const enabled = getHumanAuthEnabled();
  let configured = false;
  if (enabled) {
    try {
      getSupabaseAuthConfiguration();
      configured = true;
    } catch {
      configured = false;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <BevSenseBrand className="text-slate-950" />
        <section className="mt-8 rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use your BevSense work email and password.
          </p>
          {configured ? (
            <LoginForm />
          ) : (
            <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Human sign-in is unavailable in this environment.
            </p>
          )}
          <Link
            className="mt-6 inline-flex text-sm font-semibold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            href="/"
          >
            Back to BevSense
          </Link>
        </section>
      </div>
    </main>
  );
}
