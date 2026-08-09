import { ApplicationShell } from "@/components/layout/application-shell";
import { Overview } from "@/features/overview/overview";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { simulatedTelemetryProvider } from "@/lib/telemetry/simulated-provider";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { context, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/",
  );
  const snapshot = await simulatedTelemetryProvider.getSnapshot(scope);

  return (
    <ApplicationShell context={context}>
      <Overview snapshot={snapshot} />
    </ApplicationShell>
  );
}
