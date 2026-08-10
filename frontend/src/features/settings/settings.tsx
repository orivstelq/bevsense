"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { demoLocations } from "@/config/demo-context";
import type { DemoPersona } from "@/config/demo-personas";
import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";

type SettingsProps = {
  currentLocationId: string;
  persona: DemoPersona;
  language: DemoLanguage;
};

const locationOptions = Object.values(demoLocations);

export function Settings({
  currentLocationId,
  persona,
  language,
}: SettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = getDemoTranslations(language);

  function navigate(locationId: string, nextLanguage: DemoLanguage) {
    const query = new URLSearchParams({
      mode: "demo",
      location: locationId,
      persona: persona.id,
      lang: nextLanguage,
      demoStartedAt: searchParams.get("demoStartedAt") ?? "",
    });

    router.push(`/settings?${query.toString()}`);
  }

  function restartPresentation() {
    const query = new URLSearchParams({
      mode: "demo",
      location: currentLocationId,
      persona: persona.id,
      lang: language,
      demoStartedAt: new Date().toISOString(),
      started: "1",
    });
    router.push(`/?${query.toString()}`);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="settings-title">
        <p className="text-sm font-medium text-slate-500">Demo</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="settings-title"
        >
          {copy.navigation.settings}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {copy.settingsDescription}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            {copy.language}
          </h2>
          <label
            className="mt-4 block text-sm font-medium text-slate-700"
            htmlFor="settings-language"
          >
            {copy.language}
          </label>
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
            id="settings-language"
            onChange={(event) =>
              navigate(
                currentLocationId,
                event.currentTarget.value as DemoLanguage,
              )
            }
            value={language}
          >
            <option value="en">{copy.english}</option>
            <option value="es">{copy.spanish}</option>
          </select>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            {copy.assignedDiningCenter}
          </h2>
          {persona.id === "utility-worker" ? (
            <>
              <label
                className="mt-4 block text-sm font-medium text-slate-700"
                htmlFor="settings-location"
              >
                {copy.assignedDiningCenter}
              </label>
              <select
                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
                id="settings-location"
                onChange={(event) =>
                  navigate(event.currentTarget.value, language)
                }
                value={currentLocationId}
              >
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {copy.assignmentHelp}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {copy.locationFromHeader}
            </p>
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Restart presentation
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Return simulated inventory to its baseline and restart the
            presentation clock for this session.
          </p>
          <button
            className="mt-4 min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
            onClick={restartPresentation}
            type="button"
          >
            Restart presentation
          </button>
        </section>
      </div>
    </div>
  );
}
