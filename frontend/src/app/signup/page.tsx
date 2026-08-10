import type { Metadata } from "next";
import Link from "next/link";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { SignupForm } from "@/features/auth/signup-form";
import {
  getHumanAuthEnabled,
  getSelfSignupEnabled,
  getSupabaseAuthConfiguration,
} from "@/lib/auth/auth-environment";
import { loadSignupOptions } from "@/lib/auth/access-onboarding";

export const metadata: Metadata = { title: "Create Account | BevSense" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const enabled = getHumanAuthEnabled() && getSelfSignupEnabled();
  let options = null;
  if (enabled) {
    try {
      getSupabaseAuthConfiguration();
      options = await loadSignupOptions();
    } catch {
      options = null;
    }
  }
  const available =
    options && options.organizations.length > 0 && options.locations.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <BevSenseBrand className="text-slate-950" />
        <section className="mt-8 rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-950">Create account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Request access to your BevSense organization and workplace.
          </p>
          {available && options ? (
            <SignupForm options={options} />
          ) : (
            <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Account creation is unavailable in this environment.
            </p>
          )}
          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              className="font-semibold text-slate-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              href="/login"
            >
              Sign In
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
