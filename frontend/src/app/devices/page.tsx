import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { Devices } from "@/features/devices/devices";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export const metadata: Metadata = {
  title: "Devices | BiB Monitor",
};

export default async function DevicesPage({
  searchParams,
}: PageProps<"/devices">) {
  const { context, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/devices",
  );
  const snapshot = await simulatedTelemetryProvider.getSnapshot(scope);

  return (
    <ApplicationShell context={context}>
      <Devices snapshot={snapshot} />
    </ApplicationShell>
  );
}
