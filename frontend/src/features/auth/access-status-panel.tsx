import Link from "next/link";

import { signOut } from "@/app/login/actions";
import type { HumanSessionState, SelfServiceRole } from "@/types/access-onboarding";

const roleLabels: Record<SelfServiceRole, string> = {
  "utility-worker": "Utility Worker",
  "supervisor-manager": "Supervisor / Manager",
  technician: "Technician",
};

type RestrictedState = Exclude<
  HumanSessionState,
  { status: "signed-out" | "active" }
>;

export function AccessStatusPanel({ state }: { state: RestrictedState }) {
  const request = "request" in state ? state.request : null;
  const heading =
    state.status === "pending"
      ? "Access awaiting approval"
      : state.status === "rejected"
        ? "Access request not approved"
        : state.status === "no-request"
          ? "Access request needed"
          : "Account status unavailable";
  const description =
    state.status === "pending"
      ? "Your account is verified, but operational access has not been approved yet."
      : state.status === "rejected"
        ? "Your account remains signed in, but it does not have operational access."
        : state.status === "no-request"
          ? "Your identity is verified, but no BevSense access request is available."
          : "BevSense could not retrieve your current account access status.";

  return (
    <section className="mx-auto min-h-[calc(100vh-10rem)] max-w-2xl py-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Account access
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {heading}
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>

      {request && (
        <dl className="mt-8 grid gap-4 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-2 sm:p-6">
          <div>
            <dt className="text-slate-500">Requested organization</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {request.requestedOrganizationName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Requested workplace</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {request.requestedLocationName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Requested role</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {roleLabels[request.requestedRole]}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-1 font-semibold capitalize text-slate-950">
              {request.status}
            </dd>
          </div>
          {state.status === "rejected" && request.reviewNote && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Review note</dt>
              <dd className="mt-1 leading-6 text-slate-800">
                {request.reviewNote}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form action={signOut}>
          <button
            className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500 sm:w-auto"
            type="submit"
          >
            Sign Out
          </button>
        </form>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
          href="/demo"
        >
          Launch Demo
        </Link>
      </div>
    </section>
  );
}
