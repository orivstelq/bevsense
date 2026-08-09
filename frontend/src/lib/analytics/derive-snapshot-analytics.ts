import { evaluateAlerts } from "@/lib/alerts/evaluate-alerts";
import { deriveInventoryState } from "@/lib/inventory-calculations";
import { selectLatestReadingForTray } from "@/lib/telemetry/selectors";
import type { AlertPolicy } from "@/types/alerts";
import type {
  CurrentInventoryLevel,
  SnapshotAnalytics,
} from "@/types/analytics";
import type {
  LocationScope,
  LocationTelemetrySnapshot,
} from "@/types/domain";

function matchesScope(record: LocationScope, scope: LocationScope) {
  return (
    record.organizationId === scope.organizationId &&
    record.locationId === scope.locationId
  );
}

function compareText(first: string, second: string) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function compareInventoryLevels(
  first: CurrentInventoryLevel,
  second: CurrentInventoryLevel,
) {
  const percentageDifference =
    first.remainingPercentage - second.remainingPercentage;

  if (percentageDifference !== 0) {
    return percentageDifference;
  }

  return (
    compareText(first.productName, second.productName) ||
    compareText(first.trayName, second.trayName) ||
    compareText(first.inventoryItemId, second.inventoryItemId)
  );
}

export function deriveSnapshotAnalytics(
  snapshot: LocationTelemetrySnapshot,
  policy: AlertPolicy,
): SnapshotAnalytics {
  const trays = snapshot.sensorTrays.filter((tray) =>
    matchesScope(tray, snapshot),
  );
  const inventoryItems = snapshot.inventoryItems.filter((item) =>
    matchesScope(item, snapshot),
  );
  const latestReadingByTrayId = new Map(
    trays.map((tray) => [
      tray.id,
      selectLatestReadingForTray(snapshot.telemetryReadings, {
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        trayId: tray.id,
      }),
    ]),
  );
  const currentInventoryLevels: CurrentInventoryLevel[] = [];
  let assignedItemsWithReadingCount = 0;

  for (const inventoryItem of inventoryItems) {
    const tray = trays.find((candidate) => candidate.id === inventoryItem.trayId);
    const latestReading = tray
      ? latestReadingByTrayId.get(tray.id) ?? null
      : null;

    if (!tray || !latestReading) {
      continue;
    }

    assignedItemsWithReadingCount += 1;
    const { remainingPercentage } = deriveInventoryState(
      latestReading,
      inventoryItem,
    );

    if (remainingPercentage !== null) {
      currentInventoryLevels.push({
        inventoryItemId: inventoryItem.id,
        trayId: tray.id,
        productName: inventoryItem.productName,
        trayName: tray.name,
        remainingPercentage,
      });
    }
  }

  currentInventoryLevels.sort(compareInventoryLevels);

  const remainingPercentages = currentInventoryLevels.map(
    (level) => level.remainingPercentage,
  );
  const remainingPercentageTotal = remainingPercentages.reduce(
    (total, percentage) => total + percentage,
    0,
  );
  const validInventoryLevelCount = remainingPercentages.length;
  const traysWithLatestReadingCount = [...latestReadingByTrayId.values()].filter(
    (reading) => reading !== null,
  ).length;
  const alertFindings = evaluateAlerts(snapshot, policy);

  return {
    organizationId: snapshot.organizationId,
    locationId: snapshot.locationId,
    dataSource: snapshot.dataSource,
    inventory: {
      configuredTrayCount: trays.length,
      assignedInventoryCount: inventoryItems.length,
      unassignedTrayCount: trays.filter(
        (tray) =>
          !inventoryItems.some((item) => item.trayId === tray.id),
      ).length,
      validInventoryLevelCount,
      unavailableInventoryLevelCount:
        inventoryItems.length - validInventoryLevelCount,
      averageRemainingPercentage:
        validInventoryLevelCount > 0
          ? remainingPercentageTotal / validInventoryLevelCount
          : null,
      lowestRemainingPercentage:
        validInventoryLevelCount > 0 ? Math.min(...remainingPercentages) : null,
      highestRemainingPercentage:
        validInventoryLevelCount > 0 ? Math.max(...remainingPercentages) : null,
    },
    trayFamilies: {
      compact25GallonCount: trays.filter(
        (tray) => tray.family === "2.5-gallon",
      ).length,
      standard5GallonCount: trays.filter(
        (tray) => tray.family === "5-gallon",
      ).length,
    },
    telemetry: {
      traysWithLatestReadingCount,
      traysWithoutReadingCount: trays.length - traysWithLatestReadingCount,
      assignedItemsWithReadingCount,
      assignedItemsWithoutReadingCount:
        inventoryItems.length - assignedItemsWithReadingCount,
      trayCoveragePercentage:
        trays.length > 0
          ? (traysWithLatestReadingCount / trays.length) * 100
          : null,
    },
    alerts: {
      activeFindingCount: alertFindings.length,
      warningFindingCount: alertFindings.filter(
        (finding) => finding.severity === "warning",
      ).length,
      criticalFindingCount: alertFindings.filter(
        (finding) => finding.severity === "critical",
      ).length,
      deviceFindingCount: alertFindings.filter(
        (finding) =>
          finding.kind === "controller-status" ||
          finding.kind === "tray-status",
      ).length,
    },
    currentInventoryLevels,
  };
}
