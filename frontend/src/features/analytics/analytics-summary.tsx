import type { SnapshotAnalytics } from "@/types/analytics";

type AnalyticsSummaryProps = {
  analytics: SnapshotAnalytics;
};

function formatPercentage(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value)}%`;
}

export function AnalyticsSummary({ analytics }: AnalyticsSummaryProps) {
  const summaryItems = [
    {
      label: "Average remaining",
      value: formatPercentage(analytics.inventory.averageRemainingPercentage),
      detail: `${analytics.inventory.validInventoryLevelCount} valid levels`,
    },
    {
      label: "Lowest remaining",
      value: formatPercentage(analytics.inventory.lowestRemainingPercentage),
      detail: `Highest ${formatPercentage(analytics.inventory.highestRemainingPercentage)}`,
    },
    {
      label: "Valid inventory levels",
      value: `${analytics.inventory.validInventoryLevelCount} of ${analytics.inventory.assignedInventoryCount}`,
      detail: `${analytics.inventory.unavailableInventoryLevelCount} unavailable`,
    },
    {
      label: "Telemetry coverage",
      value: formatPercentage(analytics.telemetry.trayCoveragePercentage),
      detail: `${analytics.telemetry.traysWithLatestReadingCount} of ${analytics.inventory.configuredTrayCount} trays`,
    },
  ] as const;

  return (
    <section aria-labelledby="analytics-summary-title">
      <h2 className="sr-only" id="analytics-summary-title">
        Current snapshot summary
      </h2>
      <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:grid-cols-4">
        {summaryItems.map((item, index) => (
          <div
            className={`min-w-0 px-4 py-4 sm:px-5 ${index % 2 === 1 ? "border-l border-slate-200" : ""} ${index >= 2 ? "border-t border-slate-200 lg:border-t-0" : ""} ${index > 0 ? "lg:border-l lg:border-slate-200" : ""}`}
            key={item.label}
          >
            <dt className="text-xs leading-4 font-medium text-slate-500 sm:text-sm">
              {item.label}
            </dt>
            <dd className="mt-2 break-words text-xl font-semibold text-slate-950 sm:text-2xl">
              {item.value}
            </dd>
            <dd className="mt-1 text-xs leading-5 text-slate-500">
              {item.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
