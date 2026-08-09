import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { Alerts } from "@/features/alerts/alerts";
import { evaluateAlerts } from "@/lib/alerts/evaluate-alerts";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Alerts | BiB Monitor",
};

export default async function AlertsPage({
  searchParams,
}: PageProps<"/alerts">) {
  const { context, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/alerts",
  );
  const snapshot = await simulatedTelemetryProvider.getSnapshot(scope);
  const findings = evaluateAlerts(snapshot, demoAlertPolicy);

  return (
    <ApplicationShell context={context}>
      <Alerts findings={findings} policy={demoAlertPolicy} />
    </ApplicationShell>
  );
}
