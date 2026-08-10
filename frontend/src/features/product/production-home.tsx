import Link from "next/link";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { HardwareDisconnectedIllustration } from "@/components/product/hardware-disconnected-illustration";

type ProductionHomeProps = {
  hardwareConnectionsEnabled: boolean;
};

export function ProductionHome({
  hardwareConnectionsEnabled,
}: ProductionHomeProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-5">
          <BevSenseBrand className="text-slate-950" />
        </header>

        <section className="grid min-h-[calc(100vh-10rem)] items-center gap-10 py-10 md:grid-cols-[minmax(0,1fr)_18rem] md:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Smart beverage inventory monitoring
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {hardwareConnectionsEnabled
                ? "Waiting for live telemetry"
                : "Hardware not connected"}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              No live controller or sensor tray data is currently available.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {hardwareConnectionsEnabled
                ? "Hardware connections are enabled, but no current telemetry has been received."
                : "Hardware connections are not enabled in this environment."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="min-h-11 rounded-md bg-slate-300 px-5 text-sm font-semibold text-slate-600"
                disabled
                type="button"
              >
                Sign In
              </button>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
                href="/demo"
              >
                Launch Demo
              </Link>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Account sign-in will be available in a future release.
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <HardwareDisconnectedIllustration />
          </div>
        </section>
      </div>
    </main>
  );
}
