import type { Metadata } from "next";
import Link from "next/link";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { LoginForm } from "@/features/auth/login-form";
import {
  getHumanAuthEnabled,
  getSelfSignupEnabled,
  getSupabaseAuthConfiguration,
} from "@/lib/auth/auth-environment";

export const metadata: Metadata = { title: "Sign In | BevSense" };

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const enabled = getHumanAuthEnabled();
  const signupEnabled = enabled && getSelfSignupEnabled();
  const confirmation = (await searchParams).confirmation;
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
          {confirmation === "success" && (
            <p
              className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
              role="status"
            >
              Email verified. Sign in to continue.
            </p>
          )}
          {confirmation === "failed" && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              The verification link could not be completed. Try signing in or request a new account email.
            </p>
          )}
          {confirmation === "request-failed" && (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
              Your email was verified, but the access request could not be submitted. Sign in to try again.
            </p>
          )}
          {configured ? (
            <LoginForm />
          ) : (
            <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Human sign-in is unavailable in this environment.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            {signupEnabled && (
              <Link
                className="font-semibold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                href="/signup"
              >
                Create Account
              </Link>
            )}
            <Link
              className="font-semibold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              href="/"
            >
              Back to BevSense
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
