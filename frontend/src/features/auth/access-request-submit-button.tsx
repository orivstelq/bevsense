"use client";

import { useFormStatus } from "react-dom";

const styles = {
  approve:
    "min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-slate-500 sm:col-span-2 sm:justify-self-end",
  reject:
    "min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-wait disabled:border-slate-300 disabled:text-slate-500",
} as const;

export function AccessRequestSubmitButton({
  intent,
}: {
  intent: keyof typeof styles;
}) {
  const { pending } = useFormStatus();
  const label = intent === "approve" ? "Approve Access" : "Reject";
  const pendingLabel = intent === "approve" ? "Approving..." : "Rejecting...";

  return (
    <button
      aria-live="polite"
      className={styles[intent]}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
