import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { Inventory } from "@/features/inventory/inventory";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Inventory | BiB Monitor",
};

export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  const { context, persona, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/inventory",
  );
  const telemetry = await loadLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} persona={persona}>
      {telemetry.status === "ready" ? (
        <Inventory snapshot={telemetry.snapshot} />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
