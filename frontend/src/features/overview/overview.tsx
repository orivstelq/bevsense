import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { evaluateAlerts } from "@/lib/alerts/evaluate-alerts";
import type { LocationTelemetrySnapshot } from "@/types/domain";

type OverviewProps = {
  snapshot: LocationTelemetrySnapshot;
};

function pluralize(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function Overview({ snapshot }: OverviewProps) {
  const alertFindings = evaluateAlerts(snapshot, demoAlertPolicy);
  const overviewStates = [
    {
      label: "Inventory",
      state: pluralize(snapshot.inventoryItems.length, "assigned inventory item"),
      description: `Simulated fixture assignments across ${pluralize(snapshot.sensorTrays.length, "configured tray")}.`,
    },
    {
      label: "Alerts",
      state: pluralize(alertFindings.length, "active demo finding"),
      description: "Derived locally under the simulation-only demo alert policy.",
    },
    {
      label: "Controllers / Devices",
      state: pluralize(snapshot.controllers.length, "simulated controller"),
      description:
        "Fixture data only; no physical controller or sensor tray is connected.",
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
          Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Current readiness for inventory monitoring at this location.
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

        <div className="grid gap-4 md:grid-cols-3">
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
