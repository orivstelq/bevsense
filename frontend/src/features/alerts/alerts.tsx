import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { getInventoryLevelPresentation } from "@/config/inventory-levels";
import { deriveCurrentInventoryEntries } from "@/lib/inventory/current-inventory";
import type { LocationTelemetrySnapshot } from "@/types/domain";

type AlertsProps = {
  snapshot: LocationTelemetrySnapshot;
  locationName: string;
  language: DemoLanguage;
};

export function Alerts({ snapshot, locationName, language }: AlertsProps) {
  const copy = getDemoTranslations(language);
  const replacements = deriveCurrentInventoryEntries(snapshot)
    .map((entry) => {
      const percentage = entry.derivedState?.remainingPercentage;
      const level =
        percentage == null ? null : getInventoryLevelPresentation(percentage);

      return { entry, level };
    })
    .filter(({ entry, level }) => entry.inventoryItem && level?.band === "replace");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="alerts-title">
        <p className="text-sm font-medium text-slate-500">Operations</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="alerts-title"
        >
          {copy.navigation.alerts}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {copy.alertsDescription}
        </p>
      </section>

      <aside className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold tracking-[0.08em] text-amber-950">
          DEMO REPLACEMENT VIEW
        </h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          This action list shows only assigned BiBs at 10% remaining or below
          in the deterministic simulation snapshot.
        </p>
      </aside>

      <section aria-labelledby="replacement-list-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="text-lg font-semibold text-slate-950"
              id="replacement-list-title"
            >
              {copy.replace}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{locationName}</p>
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {replacements.length}{" "}
            {replacements.length === 1
              ? copy.position.toLowerCase()
              : copy.positions}
          </span>
        </div>

        {replacements.length > 0 ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {replacements.map(({ entry, level }) => (
              <li key={entry.tray.id}>
                <article className="h-full rounded-md border border-l-4 border-red-300 border-l-red-600 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold text-slate-950">
                        {entry.inventoryItem?.productName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {locationName} · {copy.rack} {entry.rackPosition?.rackNumber} · {copy.position} {entry.rackPosition?.positionNumber}
                      </p>
                    </div>
                    <span className="rounded-sm border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
                      {copy.replace}
                    </span>
                  </div>
                  <p className="mt-5 text-2xl font-semibold text-red-700">
                    {level?.roundedPercentage}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {copy.remaining}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-emerald-900">
              {copy.allGood}
            </h3>
            <p className="mt-2 text-sm font-medium text-emerald-900">
              {copy.noReplacements}
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              {copy.aboveThreshold}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
