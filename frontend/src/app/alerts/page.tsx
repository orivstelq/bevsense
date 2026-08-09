import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { Alerts } from "@/features/alerts/alerts";
import { evaluateAlerts } from "@/lib/alerts/evaluate-alerts";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Alerts | BevSense",
};

export default async function AlertsPage({
  searchParams,
}: PageProps<"/alerts">) {
  const { context, persona, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/alerts",
  );
  const telemetry = await loadLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} persona={persona}>
      {telemetry.status === "ready" ? (
        <Alerts
          findings={evaluateAlerts(telemetry.snapshot, demoAlertPolicy)}
          policy={demoAlertPolicy}
        />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
