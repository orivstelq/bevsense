"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="mt-6 min-h-11 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-slate-500"
      disabled={pending}
      type="submit"
    >
      {pending ? "Signing in..." : "Sign In"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(signIn, initialState);

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Work email
        </label>
        <input
          autoComplete="email"
          className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
