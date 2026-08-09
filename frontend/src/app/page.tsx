import { ApplicationShell } from "@/components/layout/application-shell";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { Overview } from "@/features/overview/overview";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";
import { loadLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { context, persona, scope } = await resolveDemoContextFromSearchParams(
    searchParams,
    "/",
  );
  const telemetry = await loadLocationTelemetry(scope);

  return (
    <ApplicationShell context={context} persona={persona}>
      {telemetry.status === "ready" ? (
        <Overview persona={persona} snapshot={telemetry.snapshot} />
      ) : (
        <TelemetryUnavailable />
      )}
    </ApplicationShell>
  );
}
