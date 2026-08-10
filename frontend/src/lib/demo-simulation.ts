import { selectLatestReadingForTray } from "./telemetry/selectors.ts";
import type {
  InventoryItem,
  LocationTelemetrySnapshot,
  SensorTray,
} from "@/types/domain";

const realMillisecondsPerSimulatedDay = 60_000;

const productDailyConsumptionPercentage: Record<string, number> = {
  "Coca-Cola": 4.2,
  "Diet Coke": 3.5,
  "Coca-Cola Zero": 3.2,
  Sprite: 3.7,
  "Dr Pepper": 3,
  Fanta: 2.4,
  Lemonade: 2.2,
  "Root Beer": 2,
  "Ginger Ale": 1.4,
  "Fruit Punch": 2,
  "Sweet Tea": 1.8,
  "Unsweet Tea": 0.8,
  Powerade: 2.6,
  "Orange Beverage": 1.6,
  "Specialty Water": 0.4,
};

export function isValidDemoStartedAt(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function getDemoDailyConsumptionPercentage(
  item: InventoryItem,
  tray: SensorTray,
) {
  if (tray.id === "demo-union-hall-tray-r3-p8") {
    return 1;
  }
  if (tray.id === "demo-union-hall-tray-r1-p8") {
    return 0.5;
  }

  const positionMatch = /-r([1-3])-p(10|[1-9])$/.exec(tray.id);
  const positionSeed = positionMatch
    ? Number(positionMatch[1]) * 10 + Number(positionMatch[2])
    : 0;
  const multiplier = 0.85 + (positionSeed % 5) * 0.075;
  return (productDailyConsumptionPercentage[item.productName] ?? 1) * multiplier;
}

export function deriveDemoSnapshotAt(
  baseline: LocationTelemetrySnapshot,
  demoStartedAt: string,
  currentAt: string,
): LocationTelemetrySnapshot {
  const elapsedMilliseconds = Math.max(
    0,
    Date.parse(currentAt) - Date.parse(demoStartedAt),
  );
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds === 0) {
    return baseline;
  }

  const inventoryByTray = new Map(
    baseline.inventoryItems.map((item) => [item.trayId, item]),
  );
  const trayById = new Map(baseline.sensorTrays.map((tray) => [tray.id, tray]));
  const latestReadingIds = new Set(
    baseline.sensorTrays.flatMap((tray) => {
      const reading = selectLatestReadingForTray(baseline.telemetryReadings, {
        organizationId: baseline.organizationId,
        locationId: baseline.locationId,
        trayId: tray.id,
      });
      return reading ? [reading.id] : [];
    }),
  );
  const elapsedSimulatedDays =
    elapsedMilliseconds / realMillisecondsPerSimulatedDay;

  return {
    ...baseline,
    telemetryReadings: baseline.telemetryReadings.map((reading) => {
      if (!latestReadingIds.has(reading.id)) {
        return reading;
      }

      const item = inventoryByTray.get(reading.trayId);
      const tray = trayById.get(reading.trayId);
      if (!item || !tray) {
        return reading;
      }

      const consumedProductWeightGrams =
        item.fullProductWeightGrams *
        (getDemoDailyConsumptionPercentage(item, tray) / 100) *
        elapsedSimulatedDays;

      return {
        ...reading,
        timestamp: currentAt,
        grossWeightGrams: Math.max(
          item.tareWeightGrams,
          reading.grossWeightGrams - consumedProductWeightGrams,
        ),
      };
    }),
  };
}
