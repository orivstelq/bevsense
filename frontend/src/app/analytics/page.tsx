import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { Analytics } from "@/features/analytics/analytics";
import { deriveSnapshotAnalytics } from "@/lib/analytics/derive-snapshot-analytics";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Analytics | BiB Monitor",
};

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  const { context, persona, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/analytics",
  );
  const snapshot = await simulatedTelemetryProvider.getSnapshot(scope);
  const analytics = deriveSnapshotAnalytics(snapshot, demoAlertPolicy);

  return (
    <ApplicationShell context={context} persona={persona}>
      <Analytics analytics={analytics} />
    </ApplicationShell>
  );
}
