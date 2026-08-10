"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createAccount,
  type SignupState,
} from "@/app/signup/actions";
import type { SignupOptions } from "@/types/access-onboarding";

const initialState: SignupState = { status: "idle", message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="mt-2 min-h-11 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-slate-500"
      disabled={pending}
      type="submit"
    >
      {pending ? "Creating account..." : "Create Account"}
    </button>
  );
}

const inputClassName =
  "mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400";

export function SignupForm({ options }: { options: SignupOptions }) {
  const [state, action] = useActionState(createAccount, initialState);
  const [organizationId, setOrganizationId] = useState(
    options.organizations[0]?.id ?? "",
  );
  const locations = useMemo(
    () =>
      options.locations.filter(
        (location) => location.organizationId === organizationId,
      ),
    [options.locations, organizationId],
  );

  if (state.status === "confirmation-required") {
    return (
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold text-slate-950">Account created</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{state.message}</p>
        <Link
          className="mt-4 inline-flex text-sm font-semibold text-slate-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          href="/login"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
          Full name
        </label>
        <input
          autoComplete="name"
          className={inputClassName}
          id="fullName"
          maxLength={255}
          minLength={2}
          name="fullName"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="signup-email">
          Work email
        </label>
        <input
          autoComplete="email"
          className={inputClassName}
          id="signup-email"
          maxLength={320}
          name="email"
          required
          type="email"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="signup-password">
            Password
          </label>
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="signup-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="organizationId">
          Organization
        </label>
        <select
          className={inputClassName}
          id="organizationId"
          name="organizationId"
          onChange={(event) => setOrganizationId(event.currentTarget.value)}
          required
          value={organizationId}
        >
          {options.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="locationId">
          Workplace / dining center
        </label>
        <select className={inputClassName} id="locationId" name="locationId" required>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="requestedRole">
          Requested role
        </label>
        <select className={inputClassName} id="requestedRole" name="requestedRole" required>
          <option value="utility-worker">Utility Worker</option>
          <option value="supervisor-manager">Supervisor / Manager</option>
          <option value="technician">Technician</option>
        </select>
      </div>
      {state.status === "error" && state.message && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
