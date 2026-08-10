import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { demoAlertPolicy } from "@/config/demo-alert-policy";
import { demoLocations, demoOrganization } from "@/config/demo-context";
import { Analytics } from "@/features/analytics/analytics";
import { deriveDemoPlanning } from "@/lib/analytics/derive-demo-planning";
import { deriveSnapshotAnalytics } from "@/lib/analytics/derive-snapshot-analytics";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadDemoLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Analytics | BevSense",
};

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  const { context, demoStartedAt, language, persona, scope } =
    await resolveDemoContextFromSearchParams(searchParams, "/analytics");
  const currentAt = new Date().toISOString();
  const locationLoads = await Promise.all(
    Object.values(demoLocations).map((location) =>
      loadDemoLocationTelemetry(
        {
          organizationId: demoOrganization.id,
          locationId: location.id,
        },
        demoStartedAt,
        currentAt,
      ),
    ),
  );
  const snapshots = locationLoads.flatMap((result) =>
    result.status === "ready" ? [result.snapshot] : [],
  );
  const telemetry = locationLoads.find(
    (result) =>
      result.status === "ready" && result.snapshot.locationId === scope.locationId,
  );

  return (
    <ApplicationShell context={context} language={language} persona={persona}>
      {telemetry?.status === "ready" ? (
        <Analytics
          analytics={deriveSnapshotAnalytics(
            telemetry.snapshot,
            demoAlertPolicy,
          )}
          language={language}
          planning={deriveDemoPlanning(snapshots)}
        />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
