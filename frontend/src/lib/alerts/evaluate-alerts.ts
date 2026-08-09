import { deriveInventoryState } from "@/lib/inventory-calculations";
import { selectLatestReadingForTray } from "@/lib/telemetry/selectors";
import type { AlertPolicy, DerivedAlertFinding } from "@/types/alerts";
import type {
  LocationScope,
  LocationTelemetrySnapshot,
} from "@/types/domain";

const severityOrder = {
  critical: 0,
  warning: 1,
} as const;

function matchesScope(record: LocationScope, snapshot: LocationScope) {
  return (
    record.organizationId === snapshot.organizationId &&
    record.locationId === snapshot.locationId
  );
}

function compareFindings(
  first: DerivedAlertFinding,
  second: DerivedAlertFinding,
) {
  const severityDifference =
    severityOrder[first.severity] - severityOrder[second.severity];

  if (severityDifference !== 0) {
    return severityDifference;
  }

  if (first.kind !== second.kind) {
    return first.kind < second.kind ? -1 : 1;
  }

  return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
}

export function evaluateAlerts(
  snapshot: LocationTelemetrySnapshot,
  policy: AlertPolicy,
): readonly DerivedAlertFinding[] {
  const findings: DerivedAlertFinding[] = [];

  for (const controller of snapshot.controllers) {
    if (!matchesScope(controller, snapshot)) {
      continue;
    }

    const severity = policy.controllerStatus[controller.status];

    if (severity) {
      findings.push({
        id: `controller:${controller.id}:status-${controller.status}`,
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        severity,
        kind: "controller-status",
        title: "Controller status requires review",
        description: `${controller.name} is simulated ${controller.status} under the demo policy.`,
        assetLabel: controller.name,
        observedAt: controller.lastSeenAt,
        dataSource: snapshot.dataSource,
        controllerId: controller.id,
      });
    }
  }

  for (const tray of snapshot.sensorTrays) {
    if (!matchesScope(tray, snapshot)) {
      continue;
    }

    const severity = policy.trayStatus[tray.status];

    if (severity) {
      const controller = snapshot.controllers.find(
        (candidate) =>
          matchesScope(candidate, snapshot) &&
          candidate.id === tray.controllerId,
      );

      findings.push({
        id: `tray:${tray.id}:status-${tray.status}`,
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        severity,
        kind: "tray-status",
        title: "Sensor tray status requires review",
        description: `${tray.name} is simulated ${tray.status} under the demo policy.`,
        assetLabel: `${tray.name} · ${controller?.name ?? "Controller unavailable"}`,
        observedAt: null,
        dataSource: snapshot.dataSource,
        trayId: tray.id,
        controllerId: tray.controllerId,
      });
    }
  }

  for (const inventoryItem of snapshot.inventoryItems) {
    if (!matchesScope(inventoryItem, snapshot)) {
      continue;
    }

    const tray = snapshot.sensorTrays.find(
      (candidate) =>
        matchesScope(candidate, snapshot) &&
        candidate.id === inventoryItem.trayId,
    );

    if (!tray) {
      findings.push({
        id: `inventory:${inventoryItem.id}:telemetry-unavailable`,
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        severity: "warning",
        kind: "telemetry-unavailable",
        title: "Telemetry unavailable",
        description: `${inventoryItem.productName} references a tray unavailable in this location snapshot.`,
        assetLabel: inventoryItem.productName,
        observedAt: null,
        dataSource: snapshot.dataSource,
        inventoryItemId: inventoryItem.id,
        trayId: inventoryItem.trayId,
      });
      continue;
    }

    const controller = snapshot.controllers.find(
      (candidate) =>
        matchesScope(candidate, snapshot) &&
        candidate.id === tray.controllerId,
    );
    const affectedAssetLabel = `${inventoryItem.productName} · ${tray.name} · ${controller?.name ?? "Controller unavailable"}`;

    const latestReading = selectLatestReadingForTray(
      snapshot.telemetryReadings,
      {
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        trayId: tray.id,
      },
    );

    if (!latestReading) {
      findings.push({
        id: `inventory:${inventoryItem.id}:telemetry-unavailable`,
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        severity: "warning",
        kind: "telemetry-unavailable",
        title: "Telemetry unavailable",
        description: `No valid telemetry reading is available for ${inventoryItem.productName} on ${tray.name}.`,
        assetLabel: affectedAssetLabel,
        observedAt: null,
        dataSource: snapshot.dataSource,
        inventoryItemId: inventoryItem.id,
        trayId: tray.id,
        controllerId: tray.controllerId,
      });
      continue;
    }

    const { remainingPercentage } = deriveInventoryState(
      latestReading,
      inventoryItem,
    );

    if (remainingPercentage === null) {
      findings.push({
        id: `inventory:${inventoryItem.id}:telemetry-unavailable`,
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        severity: "warning",
        kind: "telemetry-unavailable",
        title: "Inventory state unavailable",
        description: `The latest telemetry and demo configuration for ${inventoryItem.productName} could not produce a valid inventory level.`,
        assetLabel: affectedAssetLabel,
        observedAt: latestReading.timestamp,
        dataSource: snapshot.dataSource,
        inventoryItemId: inventoryItem.id,
        trayId: tray.id,
        controllerId: tray.controllerId,
      });
      continue;
    }

    const severity =
      remainingPercentage <= policy.inventory.criticalAtOrBelowPercentage
        ? "critical"
        : remainingPercentage <= policy.inventory.warningAtOrBelowPercentage
          ? "warning"
          : null;

    if (severity) {
      findings.push({
        id: `inventory:${inventoryItem.id}:low-inventory`,
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        severity,
        kind: "low-inventory",
        title:
          severity === "critical"
            ? "Critical demo inventory level"
            : "Low demo inventory",
        description: `${inventoryItem.productName} on ${tray.name} is ${Math.round(remainingPercentage)}% remaining under the demo policy.`,
        assetLabel: affectedAssetLabel,
        observedAt: latestReading.timestamp,
        dataSource: snapshot.dataSource,
        inventoryItemId: inventoryItem.id,
        trayId: tray.id,
        controllerId: tray.controllerId,
      });
    }
  }

  return [...findings].sort(compareFindings);
}
