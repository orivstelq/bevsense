import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { Devices } from "@/features/devices/devices";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Devices | BevSense",
};

export default async function DevicesPage({
  searchParams,
}: PageProps<"/devices">) {
  const { context, persona, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/devices",
  );
  const telemetry = await loadLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} persona={persona}>
      {telemetry.status === "ready" ? (
        <Devices snapshot={telemetry.snapshot} />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
