import { demoLocations } from "@/config/demo-context";
import type { DemoPlanning } from "@/lib/analytics/derive-demo-planning";

type DemoPlanningProps = {
  planning: DemoPlanning;
};

const locationNames = new Map<string, string>(
  Object.values(demoLocations).map((location) => [location.id, location.name]),
);

function formatDays(days: number | null) {
  if (days === null) {
    return "Unavailable";
  }
  if (days < 1) {
    return `${Math.max(0, Math.round(days * 24))} hours`;
  }
  return `${Math.round(days)} days`;
}

export function DemoPlanningSection({ planning }: DemoPlanningProps) {
  const next = planning.nextLikelyReplacement;

  return (
    <section aria-labelledby="demo-planning-title" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
          Demo projection
        </p>
        <h2
          className="mt-1 text-lg font-semibold text-slate-950"
          id="demo-planning-title"
        >
          Replacement planning
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Presentation estimates use current simulated product weight and the
          deterministic demo consumption model. They are not customer
          forecasts or purchasing recommendations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-600">Next 7 days</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {planning.projectedReplacements7Days} BiBs
          </p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-600">Next 30 days</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {planning.projectedReplacements30Days} BiBs
          </p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <h3 className="text-sm font-medium text-slate-600">
            Next likely replacement
          </h3>
          {next ? (
            <div className="mt-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">{next.productName}</p>
              <p className="mt-1">
                {locationNames.get(next.locationId)} · Rack {next.rackNumber} ·
                Position {next.positionNumber}
              </p>
              <p className="mt-1">Estimated in {formatDays(next.daysUntilReplacement)}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Unavailable</p>
          )}
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-950">
            Highest-consumption products
          </h3>
          <ol className="mt-3 divide-y divide-slate-200">
            {planning.highestConsumptionProducts.map((product, index) => (
              <li
                className="flex items-center justify-between gap-4 py-2 text-sm"
                key={product.productName}
              >
                <span className="text-slate-700">
                  {index + 1}. {product.productName}
                </span>
                <span className="font-medium text-slate-950">
                  {product.fullBibEquivalentsPerDay.toFixed(2)} BiB/day
                </span>
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-950">Location outlook</h3>
          <ul className="mt-3 divide-y divide-slate-200">
            {planning.locationOutlook.map((location) => (
              <li
                className="flex items-center justify-between gap-4 py-2 text-sm"
                key={location.locationId}
              >
                <span className="text-slate-700">
                  {locationNames.get(location.locationId)}
                </span>
                <span className="text-right font-medium text-slate-950">
                  {location.projectedReplacements7Days} / 7 days · {location.projectedReplacements30Days} / 30 days
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
