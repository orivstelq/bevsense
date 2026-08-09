import { ApplicationShell } from "@/components/layout/application-shell";
import { demoContext } from "@/config/demo-context";
import { Overview } from "@/features/overview/overview";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export default async function Home() {
  const snapshot = await simulatedTelemetryProvider.getSnapshot({
    organizationId: demoContext.location.organizationId,
    locationId: demoContext.location.id,
  });

  return (
    <ApplicationShell context={demoContext}>
      <Overview snapshot={snapshot} />
    </ApplicationShell>
  );
}
