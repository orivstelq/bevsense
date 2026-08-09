import type { AlertPolicy, DerivedAlertFinding } from "@/types/alerts";

import { AlertFindingCard } from "./alert-finding-card";
import { AlertsSummary } from "./alerts-summary";

type AlertsProps = {
  findings: readonly DerivedAlertFinding[];
  policy: AlertPolicy;
};

function policyResultLabel(result: "warning" | "critical" | null) {
  return result ?? "no finding";
}

export function Alerts({ findings, policy }: AlertsProps) {
  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  const deviceFindingCount = findings.filter(
    (finding) =>
      finding.kind === "controller-status" || finding.kind === "tray-status",
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="alerts-title">
        <p className="text-sm font-medium text-slate-500">Operations</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="alerts-title"
        >
          Alerts
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Current findings derived locally from the location snapshot.
        </p>
      </section>

      <aside className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold tracking-[0.08em] text-amber-950">
          DETERMINISTIC SIMULATION DATA
        </h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          These are current derived demo findings, not persisted alerts. No
          acknowledgement, notification, or historical alert system is active.
        </p>
      </aside>

      <AlertsSummary
        activeCount={findings.length}
        criticalCount={criticalCount}
        deviceFindingCount={deviceFindingCount}
        warningCount={warningCount}
      />

      <section aria-labelledby="demo-policy-title">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="demo-policy-title"
          >
            {policy.name}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            These simulation-only values demonstrate evaluation architecture.
            They are not production operating thresholds, manufacturer
            guidance, or customer policy.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Inventory
              </h3>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                <li>
                  Critical: ≤
                  {policy.inventory.criticalAtOrBelowPercentage}%
                </li>
                <li>
                  Warning: &gt;
                  {policy.inventory.criticalAtOrBelowPercentage}% to ≤
                  {policy.inventory.warningAtOrBelowPercentage}%
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Controllers
              </h3>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                <li>
                  Online → {policyResultLabel(policy.controllerStatus.online)}
                </li>
                <li>
                  Offline → {policyResultLabel(policy.controllerStatus.offline)}
                </li>
                <li>
                  Unknown → {policyResultLabel(policy.controllerStatus.unknown)}
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Sensor trays
              </h3>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                <li>Ready → {policyResultLabel(policy.trayStatus.ready)}</li>
                <li>Offline → {policyResultLabel(policy.trayStatus.offline)}</li>
                <li>Fault → {policyResultLabel(policy.trayStatus.fault)}</li>
                <li>Unknown → {policyResultLabel(policy.trayStatus.unknown)}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="active-findings-title">
        <div className="mb-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="active-findings-title"
          >
            Active findings
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Findings are recalculated from the current deterministic snapshot;
            they are not historical events.
          </p>
        </div>

        {findings.length > 0 ? (
          <ul className="space-y-3">
            {findings.map((finding) => (
              <li key={finding.id}>
                <AlertFindingCard finding={finding} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No active findings under the current demo policy.
          </div>
        )}
      </section>
    </div>
  );
}
