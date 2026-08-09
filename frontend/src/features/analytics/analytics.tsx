import type { SnapshotAnalytics } from "@/types/analytics";

import { AnalyticsSummary } from "./analytics-summary";
import { InventoryDistribution } from "./inventory-distribution";

type AnalyticsProps = {
  analytics: SnapshotAnalytics;
};

function MetricList({
  items,
}: {
  items: readonly { label: string; value: number }[];
}) {
  return (
    <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
      {items.map((item) => (
        <div
          className="flex min-w-0 items-center justify-between gap-4 py-3"
          key={item.label}
        >
          <dt className="min-w-0 text-sm text-slate-600">{item.label}</dt>
          <dd className="shrink-0 text-sm font-semibold text-slate-950">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Analytics({ analytics }: AnalyticsProps) {
  const configurationMetrics = [
    {
      label: "Configured trays",
      value: analytics.inventory.configuredTrayCount,
    },
    {
      label: "Assigned BiBs",
      value: analytics.inventory.assignedInventoryCount,
    },
    {
      label: "Unassigned trays",
      value: analytics.inventory.unassignedTrayCount,
    },
    {
      label: "2.5-gallon trays",
      value: analytics.trayFamilies.compact25GallonCount,
    },
    {
      label: "5-gallon trays",
      value: analytics.trayFamilies.standard5GallonCount,
    },
  ] as const;
  const telemetryMetrics = [
    {
      label: "Trays with a latest reading",
      value: analytics.telemetry.traysWithLatestReadingCount,
    },
    {
      label: "Trays without a reading",
      value: analytics.telemetry.traysWithoutReadingCount,
    },
    {
      label: "Assigned BiBs with a reading",
      value: analytics.telemetry.assignedItemsWithReadingCount,
    },
    {
      label: "Assigned BiBs without a reading",
      value: analytics.telemetry.assignedItemsWithoutReadingCount,
    },
  ] as const;
  const alertMetrics = [
    {
      label: "Active demo findings",
      value: analytics.alerts.activeFindingCount,
    },
    { label: "Warning", value: analytics.alerts.warningFindingCount },
    { label: "Critical", value: analytics.alerts.criticalFindingCount },
    {
      label: "Device findings",
      value: analytics.alerts.deviceFindingCount,
    },
  ] as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="analytics-title">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-500">
          CURRENT SNAPSHOT ANALYTICS
        </p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="analytics-title"
        >
          Analytics
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Current inventory, telemetry coverage, and demo findings for this
          location.
        </p>
      </section>

      <aside className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold tracking-[0.08em] text-amber-950">
          DETERMINISTIC SIMULATION DATA
        </h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-900">
          Values come from the current fixed demo snapshot, not live hardware.
          No historical analytics dataset exists yet, so no trends, usage
          rates, or forecasts are shown.
        </p>
      </aside>

      <AnalyticsSummary analytics={analytics} />

      <InventoryDistribution levels={analytics.currentInventoryLevels} />

      <section
        aria-labelledby="snapshot-breakdown-title"
        className="grid gap-4 lg:grid-cols-2"
      >
        <h2 className="sr-only" id="snapshot-breakdown-title">
          Current snapshot breakdown
        </h2>
        <article className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-slate-950">
            Tray configuration
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Assignment and tray-family counts from this location snapshot.
          </p>
          <MetricList items={configurationMetrics} />
        </article>
        <article className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-slate-950">
            Telemetry coverage
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Presence of a valid latest reading, without treating unassigned
            trays as alerts.
          </p>
          <MetricList items={telemetryMetrics} />
        </article>
      </section>

      <section aria-labelledby="alert-analytics-title">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="alert-analytics-title"
          >
            Current alert findings
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Current findings derived with the simulation-only demo alert
            policy. No historical, acknowledgement, or response-time analytics
            exist.
          </p>
          <MetricList items={alertMetrics} />
        </div>
      </section>
    </div>
  );
}
