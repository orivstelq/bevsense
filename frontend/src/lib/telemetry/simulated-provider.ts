import { demoTelemetrySnapshots } from "./demo-fixtures";
import type { TelemetryProvider } from "./provider";

export const simulatedTelemetryProvider = {
  dataSource: "simulated",
  getSnapshot(scope) {
    const snapshot = demoTelemetrySnapshots.find(
      (candidate) =>
        candidate.organizationId === scope.organizationId &&
        candidate.locationId === scope.locationId,
    );

    if (!snapshot) {
      return Promise.reject(
        new Error("No simulated telemetry exists for the requested location."),
      );
    }

    return Promise.resolve(snapshot);
  },
} satisfies TelemetryProvider;
