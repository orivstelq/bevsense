import type { Metadata } from "next";
import Link from "next/link";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { demoContext } from "@/config/demo-context";
import { defaultDemoPersona } from "@/config/demo-personas";

export const metadata: Metadata = {
  title: "Presentation Demo | BevSense",
};

export default function DemoEntryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-slate-200 pb-5">
          <BevSenseBrand className="text-slate-950" />
        </header>

        <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-10">
          <div className="w-full max-w-xl rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-amber-700">
              Demo Mode
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              BevSense Presentation
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              This version uses simulated beverage inventory data to
              demonstrate the platform without physical hardware.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Presentation mode is intended for walkthroughs, not a live
              equipment connection.
            </p>

            <Link
              className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:w-auto"
              href={{
                pathname: "/",
                query: {
                  mode: "demo",
                  location: demoContext.location.id,
                  persona: defaultDemoPersona.id,
                  lang: "en",
                  started: "1",
                },
              }}
            >
              Start Demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
