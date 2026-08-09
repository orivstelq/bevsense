import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { demoContext } from "@/config/demo-context";
import { Alerts } from "@/features/alerts/alerts";
import { evaluateAlerts } from "@/lib/alerts/evaluate-alerts";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Alerts | BiB Monitor",
};

export default async function AlertsPage() {
  const snapshot = await simulatedTelemetryProvider.getSnapshot({
    organizationId: demoContext.location.organizationId,
    locationId: demoContext.location.id,
  });
  const findings = evaluateAlerts(snapshot, demoAlertPolicy);

  return (
    <ApplicationShell context={demoContext}>
      <Alerts findings={findings} policy={demoAlertPolicy} />
    </ApplicationShell>
  );
}
