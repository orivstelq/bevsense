import type { DemoPersona } from "@/config/demo-personas";
import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { getInventoryLevelPresentation } from "@/config/inventory-levels";
import { deriveCurrentInventoryEntries } from "@/lib/inventory/current-inventory";
import type { LocationTelemetrySnapshot } from "@/types/domain";

type OverviewProps = {
  persona: DemoPersona;
  snapshot: LocationTelemetrySnapshot;
  language: DemoLanguage;
};

function pluralize(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function Overview({ language, persona, snapshot }: OverviewProps) {
  const copy = getDemoTranslations(language);
  const entries = deriveCurrentInventoryEntries(snapshot);
  const percentages = entries.flatMap((entry) =>
    entry.derivedState?.remainingPercentage == null
      ? []
      : [entry.derivedState.remainingPercentage],
  );
  const replacementCount = percentages.filter(
    (percentage) =>
      getInventoryLevelPresentation(percentage).band === "replace",
  ).length;
  const rackCount = new Set(
    entries.flatMap((entry) =>
      entry.rackPosition ? [entry.rackPosition.rackNumber] : [],
    ),
  ).size;
  const averagePercentage =
    percentages.length > 0
      ? percentages.reduce((sum, percentage) => sum + percentage, 0) /
        percentages.length
      : null;
  const overviewStates = [
    {
      label: copy.configuredPositions,
      state: pluralize(snapshot.sensorTrays.length, "position"),
      description: `${snapshot.inventoryItems.length} assigned BiBs in this location.`,
    },
    {
      label: copy.rack,
      state: pluralize(rackCount, "rack"),
      description: "Ten monitored positions per rack.",
    },
    {
      label: copy.replace,
      state: pluralize(replacementCount, "position"),
      description: "Assigned BiBs at 10% remaining or below.",
    },
    {
      label: "Average inventory",
      state:
        averagePercentage === null
          ? "Unavailable"
          : `${Math.round(averagePercentage)}%`,
      description: "Current average across valid simulated inventory levels.",
    },
  ] as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="overview-title">
        <p className="text-sm font-medium text-slate-500">Operations</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="overview-title"
        >
          {copy.navigation.overview}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {copy.overviewDescription}
        </p>
      </section>

      <aside
        aria-labelledby="simulation-title"
        className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5"
      >
        <h2
          className="text-sm font-bold tracking-[0.08em] text-amber-950"
          id="simulation-title"
        >
          SIMULATION MODE
        </h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          This environment uses demo organization and location labels. It is not
          receiving telemetry from real beverage equipment.
        </p>
      </aside>

      <section aria-labelledby="demo-perspective-title">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Demo perspective
          </p>
          <h2
            className="mt-2 text-lg font-semibold text-slate-950"
            id="demo-perspective-title"
          >
            {persona.label}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {persona.overview.summary}
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            {persona.overview.focusItems.map((item) => (
              <li
                className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
          {persona.overview.note && (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {persona.overview.note}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="system-status-title">
        <div className="mb-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="system-status-title"
          >
            System status
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Counts below come from deterministic simulated data for this
            location.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStates.map((item) => (
            <article
              className="min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              key={item.label}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-slate-300"
                />
                {item.label}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                {item.state}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
