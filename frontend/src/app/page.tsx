import { ApplicationShell } from "@/components/layout/application-shell";
import { DemoStartedNotice } from "@/components/demo/demo-started-notice";
import { TelemetryUnavailable } from "@/components/telemetry/telemetry-unavailable";
import { Overview } from "@/features/overview/overview";
import { ProductionHome } from "@/features/product/production-home";
import {
  isExplicitDemoMode,
  resolveDemoContextFromSearchParams,
} from "@/lib/demo-context";
import { getHardwareConnectionsEnabled } from "@/lib/product-environment";
import {
  getHumanAuthEnabled,
  getSelfSignupEnabled,
} from "@/lib/auth/auth-environment";
import { getHumanSessionState } from "@/lib/auth/human-account";
import { loadDemoLocationTelemetry } from "@/lib/telemetry/load-location-telemetry";

export default async function Home({ searchParams }: PageProps<"/">) {
  if (!(await isExplicitDemoMode(searchParams))) {
    const humanAuthEnabled = getHumanAuthEnabled();
    return (
      <ProductionHome
        hardwareConnectionsEnabled={getHardwareConnectionsEnabled()}
        humanAuthEnabled={humanAuthEnabled}
        selfSignupEnabled={humanAuthEnabled && getSelfSignupEnabled()}
        sessionState={
          humanAuthEnabled
            ? await getHumanSessionState()
            : { status: "signed-out" }
        }
      />
    );
  }

  const {
    context,
    demoStartedAt,
    language,
    persona,
    scope,
    showDemoStarted,
  } =
    await resolveDemoContextFromSearchParams(searchParams, "/");
  const telemetry = await loadDemoLocationTelemetry(scope, demoStartedAt);

  return (
    <>
      {showDemoStarted && <DemoStartedNotice />}
      <ApplicationShell
        context={context}
        language={language}
        persona={persona}
      >
        {telemetry.status === "ready" ? (
          <Overview
            language={language}
            persona={persona}
            snapshot={telemetry.snapshot}
          />
        ) : (
          <TelemetryUnavailable />
        )}
      </ApplicationShell>
    </>
  );
}
