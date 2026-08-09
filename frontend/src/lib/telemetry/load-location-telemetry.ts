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

export type LocationTelemetryLoadResult =
  | {
      readonly status: "ready";
      readonly snapshot: LocationTelemetrySnapshot;
    }
  | {
      readonly status: "unavailable";
      readonly reason: TelemetryLoadFailureReason;
    };

export async function loadLocationTelemetry(
  scope: LocationScope,
): Promise<LocationTelemetryLoadResult> {
  const provider = getTelemetryProvider();

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
