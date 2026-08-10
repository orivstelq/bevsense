import { deriveInventoryState } from "@/lib/inventory-calculations";
import { selectLatestReadingForTray } from "@/lib/telemetry/selectors";
import type { LocationTelemetrySnapshot } from "@/types/domain";

const rackPositionPattern = /^Rack ([1-3]) \/ Position (10|[1-9])$/;

export function parseRackPosition(trayName: string) {
  const match = rackPositionPattern.exec(trayName);

  return match
    ? { rackNumber: Number(match[1]), positionNumber: Number(match[2]) }
    : null;
}

export function deriveCurrentInventoryEntries(
  snapshot: LocationTelemetrySnapshot,
) {
  return snapshot.sensorTrays.map((tray) => {
    const inventoryItem =
      snapshot.inventoryItems.find(
        (item) =>
          item.organizationId === snapshot.organizationId &&
          item.locationId === snapshot.locationId &&
          item.trayId === tray.id,
      ) ?? null;
    const latestReading = selectLatestReadingForTray(
      snapshot.telemetryReadings,
      {
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        trayId: tray.id,
      },
    );
    const controller =
      snapshot.controllers.find(
        (candidate) =>
          candidate.organizationId === snapshot.organizationId &&
          candidate.locationId === snapshot.locationId &&
          candidate.id === tray.controllerId,
      ) ?? null;

    return {
      tray,
      inventoryItem,
      latestReading,
      controller,
      rackPosition: parseRackPosition(tray.name),
      derivedState:
        inventoryItem && latestReading
          ? deriveInventoryState(latestReading, inventoryItem)
          : null,
    };
  });
}

export type CurrentInventoryEntry = ReturnType<
  typeof deriveCurrentInventoryEntries
>[number];
