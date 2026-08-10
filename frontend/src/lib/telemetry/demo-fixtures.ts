import {
  demoLocations,
  demoOrganization,
} from "../../config/demo-context.ts";
import type {
  Controller,
  ContainerSizeGallons,
  InventoryItem,
  Location,
  LocationTelemetrySnapshot,
  SensorTray,
  TelemetryReading,
} from "@/types/domain";

const demoContainerWeights = {
  2.5: { tareWeightGrams: 600, fullProductWeightGrams: 12_500 },
  5: { tareWeightGrams: 900, fullProductWeightGrams: 25_000 },
} as const;

const products = [
  "Coca-Cola",
  "Diet Coke",
  "Coca-Cola Zero",
  "Sprite",
  "Dr Pepper",
  "Fanta",
  "Lemonade",
  "Root Beer",
  "Ginger Ale",
  "Fruit Punch",
  "Sweet Tea",
  "Unsweet Tea",
  "Powerade",
  "Orange Beverage",
  "Specialty Water",
] as const;

type DemoLocationFixture = {
  readonly location: Location;
  readonly productOffset: number;
  readonly remainingPercentages: readonly number[];
};

const fixtureConfigurations = [
  {
    location: demoLocations.theHearth,
    productOffset: 0,
    remainingPercentages: [
      92, 76, 64, 48, 35, 22, 9, 88, 56, 41,
      83, 71, 59, 44, 31, 17, 68, 95, 52, 27,
      79, 62, 46, 29, 14, 6, 87, 54, 38, 24,
    ],
  },
  {
    location: demoLocations.atriumDining,
    productOffset: 3,
    remainingPercentages: [
      89, 74, 61, 49, 36, 21, 8, 84, 57, 43,
      96, 81, 69, 53, 39, 18, 73, 66, 47, 28,
      91, 77, 58, 45, 32, 12, 85, 63, 51, 25,
    ],
  },
  {
    location: demoLocations.unionHall,
    productOffset: 6,
    remainingPercentages: [
      94, 82, 71, 58, 46, 34, 23, 12, 88, 65,
      97, 79, 68, 55, 42, 30, 19, 15, 86, 62,
      90, 76, 64, 52, 40, 27, 17, 11, 84, 60,
    ],
  },
  {
    location: demoLocations.theConcourse,
    productOffset: 9,
    remainingPercentages: [
      93, 78, 66, 50, 37, 24, 7, 89, 55, 43,
      85, 72, 60, 47, 34, 20, 69, 98, 53, 29,
      80, 63, 49, 36, 16, 10, 87, 57, 44, 26,
    ],
  },
] as const satisfies readonly DemoLocationFixture[];

function createDemoSnapshot({
  location,
  productOffset,
  remainingPercentages,
}: DemoLocationFixture): LocationTelemetrySnapshot {
  const scope = {
    organizationId: demoOrganization.id,
    locationId: location.id,
  } as const;
  const controllerId = `${location.id}-controller-01`;
  const controllers: readonly Controller[] = Object.freeze([
    {
      ...scope,
      id: controllerId,
      name: `${location.name} Controller`,
      status: "online",
      lastSeenAt: "2026-02-01T12:30:00.000Z",
      firmwareVersion: "demo-1.0",
    },
  ]);
  const sensorTrays: readonly SensorTray[] = Object.freeze(
    remainingPercentages.map((_, index): SensorTray => {
      const rackNumber = Math.floor(index / 10) + 1;
      const positionNumber = (index % 10) + 1;

      return {
        ...scope,
        id: `${location.id}-tray-r${rackNumber}-p${positionNumber}`,
        controllerId,
        name: `Rack ${rackNumber} / Position ${positionNumber}`,
        family: index % 4 === 0 ? "2.5-gallon" : "5-gallon",
        status: "ready",
      };
    }),
  );
  const inventoryItems: readonly InventoryItem[] = Object.freeze(
    sensorTrays.map((tray, index): InventoryItem => {
      const containerSizeGallons: ContainerSizeGallons =
        tray.family === "2.5-gallon" ? 2.5 : 5;

      return {
        ...scope,
        ...demoContainerWeights[containerSizeGallons],
        id: `${location.id}-inventory-${String(index + 1).padStart(2, "0")}`,
        trayId: tray.id,
        productName: products[(index + productOffset) % products.length],
        containerSizeGallons,
        installedAt: "2026-02-01T08:00:00.000Z",
      };
    }),
  );
  const telemetryReadings: readonly TelemetryReading[] = Object.freeze(
    inventoryItems.map((item, index): TelemetryReading => ({
      ...scope,
      id: `${location.id}-reading-${String(index + 1).padStart(2, "0")}`,
      controllerId,
      trayId: item.trayId,
      timestamp: `2026-02-01T12:${String(index).padStart(2, "0")}:00.000Z`,
      grossWeightGrams:
        item.tareWeightGrams +
        (item.fullProductWeightGrams * remainingPercentages[index]) / 100,
      dataSource: "simulated",
    })),
  );

  return Object.freeze({
    ...scope,
    dataSource: "simulated",
    controllers,
    sensorTrays,
    inventoryItems,
    telemetryReadings,
  });
}

export const demoTelemetrySnapshots = Object.freeze(
  fixtureConfigurations.map(createDemoSnapshot),
) satisfies readonly LocationTelemetrySnapshot[];
