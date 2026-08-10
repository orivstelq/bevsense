import Link from "next/link";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <BevSenseBrand className="justify-center text-slate-950" />
        <p className="mt-8 text-sm font-semibold text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          We couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          href="/"
        >
          Back to BevSense
        </Link>
      </section>
    </main>
  );
}
