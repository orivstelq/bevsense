import type { OrganizationContext } from "@/types/organization-context";
import type { TelemetryProvider } from "@/lib/telemetry/provider";
import type {
  Location,
  LocationTelemetrySnapshot,
  Organization,
} from "@/types/domain";

export const demoOrganization = {
  id: "demo-organization",
  name: "Demo Organization",
} as const satisfies Organization;

export const demoLocation = {
  id: "demo-main-dining",
  organizationId: demoOrganization.id,
  name: "Main Dining",
} as const satisfies Location;

export const demoTelemetrySnapshot = {
  organizationId: demoOrganization.id,
  locationId: demoLocation.id,
  dataSource: "simulated",
  controllers: [],
  sensorTrays: [],
  inventoryItems: [],
  telemetryReadings: [],
} as const satisfies LocationTelemetrySnapshot;

export const simulatedTelemetryProvider: TelemetryProvider = {
  dataSource: "simulated",
  getSnapshot(scope) {
    if (
      scope.organizationId !== demoTelemetrySnapshot.organizationId ||
      scope.locationId !== demoTelemetrySnapshot.locationId
    ) {
      return Promise.reject(
        new Error("No simulated telemetry exists for the requested location."),
      );
    }

    return Promise.resolve(demoTelemetrySnapshot);
  },
};

export const demoContext = {
  organization: demoOrganization,
  location: demoLocation,
  isDemo: true,
} as const satisfies OrganizationContext;
