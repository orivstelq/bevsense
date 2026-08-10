"use client";

import { useRouter } from "next/navigation";

import { demoContext } from "@/config/demo-context";
import { defaultDemoPersona } from "@/config/demo-personas";

export function StartDemoButton() {
  const router = useRouter();

  function startDemo() {
    const query = new URLSearchParams({
      mode: "demo",
      location: demoContext.location.id,
      persona: defaultDemoPersona.id,
      lang: "en",
      demoStartedAt: new Date().toISOString(),
      started: "1",
    });
    router.push(`/?${query.toString()}`);
  }

  return (
    <button
      className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:w-auto"
      onClick={startDemo}
      type="button"
    >
      Start Demo
    </button>
  );
}
