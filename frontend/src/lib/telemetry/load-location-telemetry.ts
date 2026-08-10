import "server-only";

import type {
  LocationScope,
  LocationTelemetrySnapshot,
} from "@/types/domain";

import { TelemetryProviderError } from "./api-contract";
import {
  getTelemetryProvider,
  type TelemetryLoadFailureReason,
} from "./server-provider";
import { simulatedTelemetryProvider } from "./simulated-provider";
import type { TelemetryProvider } from "./provider";
import { deriveDemoSnapshotAt } from "@/lib/demo-simulation";

export type LocationTelemetryLoadResult =
  | {
      readonly status: "ready";
      readonly snapshot: LocationTelemetrySnapshot;
    }
  | {
      readonly status: "unavailable";
      readonly reason: TelemetryLoadFailureReason;
    };

async function loadTelemetry(
  scope: LocationScope,
  provider: TelemetryProvider,
): Promise<LocationTelemetryLoadResult> {
  try {
    return {
      status: "ready",
      snapshot: await provider.getSnapshot(scope),
    };
  } catch (error) {
    return {
      status: "unavailable",
      reason:
        error instanceof TelemetryProviderError && error.code !== "configuration"
          ? error.code
          : "backend-unavailable",
    };
  }
}

export function loadLocationTelemetry(scope: LocationScope, accessToken?: string) {
  return loadTelemetry(scope, getTelemetryProvider(accessToken));
}

export async function loadDemoLocationTelemetry(
  scope: LocationScope,
  demoStartedAt: string,
  currentAt = new Date().toISOString(),
) {
  const result = await loadTelemetry(scope, simulatedTelemetryProvider);
  return result.status === "ready"
    ? {
        status: "ready" as const,
        snapshot: deriveDemoSnapshotAt(
          result.snapshot,
          demoStartedAt,
          currentAt,
        ),
      }
    : result;
}
