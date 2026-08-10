import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { Alerts } from "@/features/alerts/alerts";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadDemoLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Alerts | BevSense",
};

export default async function AlertsPage({
  searchParams,
}: PageProps<"/alerts">) {
  const { context, language, persona, scope } =
    await resolveDemoContextFromSearchParams(searchParams, "/alerts");
  const telemetry = await loadDemoLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} language={language} persona={persona}>
      {telemetry.status === "ready" ? (
        <Alerts
          language={language}
          locationName={context.location.name}
          snapshot={telemetry.snapshot}
        />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
