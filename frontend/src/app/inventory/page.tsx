import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { Inventory } from "@/features/inventory/inventory";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadDemoLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export const metadata: Metadata = {
  title: "Inventory | BevSense",
};

export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  const { context, language, persona, scope } =
    await resolveDemoContextFromSearchParams(searchParams, "/inventory");
  const telemetry = await loadDemoLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} language={language} persona={persona}>
      {telemetry.status === "ready" ? (
        <Inventory language={language} snapshot={telemetry.snapshot} />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
