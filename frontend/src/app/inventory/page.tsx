import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { Inventory } from "@/features/inventory/inventory";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

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
  const snapshot = await simulatedTelemetryProvider.getSnapshot(scope);

  return (
    <ApplicationShell context={context} persona={persona}>
      <Inventory snapshot={snapshot} />
    </ApplicationShell>
  );
}
