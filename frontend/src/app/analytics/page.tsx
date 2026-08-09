import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { demoContext } from "@/config/demo-context";
import { Analytics } from "@/features/analytics/analytics";
import { deriveSnapshotAnalytics } from "@/lib/analytics/derive-snapshot-analytics";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Analytics | BiB Monitor",
};

export default async function AnalyticsPage() {
  const snapshot = await simulatedTelemetryProvider.getSnapshot({
    organizationId: demoContext.location.organizationId,
    locationId: demoContext.location.id,
  });
  const analytics = deriveSnapshotAnalytics(snapshot, demoAlertPolicy);

  return (
    <ApplicationShell context={demoContext}>
      <Analytics analytics={analytics} />
    </ApplicationShell>
  );
}
