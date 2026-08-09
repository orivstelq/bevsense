import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { Analytics } from "@/features/analytics/analytics";
import { deriveSnapshotAnalytics } from "@/lib/analytics/derive-snapshot-analytics";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Analytics | BevSense",
};

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  const { context, persona, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/analytics",
  );
  const telemetry = await loadLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} persona={persona}>
      {telemetry.status === "ready" ? (
        <Analytics
          analytics={deriveSnapshotAnalytics(
            telemetry.snapshot,
            demoAlertPolicy,
          )}
        />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
