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

export function loadLocationTelemetry(scope: LocationScope) {
  return loadTelemetry(scope, getTelemetryProvider());
}

export function loadDemoLocationTelemetry(scope: LocationScope) {
  return loadTelemetry(scope, simulatedTelemetryProvider);
}
