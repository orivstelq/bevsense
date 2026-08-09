import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { demoContext } from "@/config/demo-context";
import { Devices } from "@/features/devices/devices";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Devices | BiB Monitor",
};

export default async function DevicesPage() {
  const snapshot = await simulatedTelemetryProvider.getSnapshot({
    organizationId: demoContext.location.organizationId,
    locationId: demoContext.location.id,
  });

  return (
    <ApplicationShell context={demoContext}>
      <Devices snapshot={snapshot} />
    </ApplicationShell>
  );
}
