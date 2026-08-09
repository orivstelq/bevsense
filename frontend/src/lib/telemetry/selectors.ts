import type { LocationScope, TelemetryReading } from "@/types/domain";

type TrayReadingScope = LocationScope & {
  readonly trayId: string;
};

export function selectLatestReadingForTray(
  readings: readonly TelemetryReading[],
  scope: TrayReadingScope,
): TelemetryReading | null {
  return readings.reduce<TelemetryReading | null>((latest, reading) => {
    if (
      reading.organizationId !== scope.organizationId ||
      reading.locationId !== scope.locationId ||
      reading.trayId !== scope.trayId
    ) {
      return latest;
    }

    const readingTime = Date.parse(reading.timestamp);

    if (Number.isNaN(readingTime)) {
      return latest;
    }

    if (!latest || readingTime > Date.parse(latest.timestamp)) {
      return reading;
    }

    return latest;
  }, null);
}
