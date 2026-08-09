import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { demoContext } from "@/config/demo-context";
import { Inventory } from "@/features/inventory/inventory";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Inventory | BiB Monitor",
};

export default async function InventoryPage() {
  const snapshot = await simulatedTelemetryProvider.getSnapshot({
    organizationId: demoContext.location.organizationId,
    locationId: demoContext.location.id,
  });

  return (
    <ApplicationShell context={demoContext}>
      <Inventory snapshot={snapshot} />
    </ApplicationShell>
  );
}
