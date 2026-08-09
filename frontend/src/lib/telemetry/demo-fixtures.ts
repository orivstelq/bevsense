import { demoLocations, demoOrganization } from "@/config/demo-context";
import type {
  Controller,
  InventoryItem,
  LocationTelemetrySnapshot,
  SensorTray,
  TelemetryReading,
} from "@/types/domain";

const mainDiningScope = {
  organizationId: demoOrganization.id,
  locationId: demoLocations.mainDining.id,
} as const;

const secondaryDiningScope = {
  organizationId: demoOrganization.id,
  locationId: demoLocations.secondaryDining.id,
} as const;

const demoContainerWeights = {
  2.5: { tareWeightGrams: 600, fullProductWeightGrams: 12_500 },
  5: { tareWeightGrams: 900, fullProductWeightGrams: 25_000 },
} as const;

const mainDiningControllerId = "demo-main-controller-01";
const secondaryDiningControllerId = "demo-secondary-controller-01";

const mainDiningTrayIds = {
  one: "demo-main-tray-01",
  two: "demo-main-tray-02",
  three: "demo-main-tray-03",
  four: "demo-main-tray-04",
  five: "demo-main-tray-05",
  six: "demo-main-tray-06",
} as const;

const secondaryDiningTrayIds = {
  one: "demo-secondary-tray-01",
  two: "demo-secondary-tray-02",
  three: "demo-secondary-tray-03",
} as const;

const mainDiningControllers = [
  {
    ...mainDiningScope,
    id: mainDiningControllerId,
    name: "Main Dining Demo Controller",
    status: "online",
    lastSeenAt: "2026-01-15T12:10:00.000Z",
  },
] as const satisfies readonly Controller[];

const mainDiningSensorTrays = [
  {
    ...mainDiningScope,
    id: mainDiningTrayIds.one,
    controllerId: mainDiningControllerId,
    name: "Rack A / Position 1",
    family: "5-gallon",
    status: "ready",
  },
  {
    ...mainDiningScope,
    id: mainDiningTrayIds.two,
    controllerId: mainDiningControllerId,
    name: "Rack A / Position 2",
    family: "5-gallon",
    status: "ready",
  },
  {
    ...mainDiningScope,
    id: mainDiningTrayIds.three,
    controllerId: mainDiningControllerId,
    name: "Rack A / Position 3",
    family: "2.5-gallon",
    status: "ready",
  },
  {
    ...mainDiningScope,
    id: mainDiningTrayIds.four,
    controllerId: mainDiningControllerId,
    name: "Rack A / Position 4",
    family: "2.5-gallon",
    status: "ready",
  },
  {
    ...mainDiningScope,
    id: mainDiningTrayIds.five,
    controllerId: mainDiningControllerId,
    name: "Rack A / Position 5",
    family: "5-gallon",
    status: "ready",
  },
  {
    ...mainDiningScope,
    id: mainDiningTrayIds.six,
    controllerId: mainDiningControllerId,
    name: "Rack A / Position 6",
    family: "2.5-gallon",
    status: "ready",
  },
] as const satisfies readonly SensorTray[];

const mainDiningInventoryItems = [
  {
    ...mainDiningScope,
    ...demoContainerWeights[5],
    id: "demo-main-inventory-01",
    trayId: mainDiningTrayIds.one,
    productName: "Demo Cola Syrup",
    containerSizeGallons: 5,
    installedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    ...mainDiningScope,
    ...demoContainerWeights[5],
    id: "demo-main-inventory-02",
    trayId: mainDiningTrayIds.two,
    productName: "Demo Diet Cola Syrup",
    containerSizeGallons: 5,
    installedAt: "2026-01-15T08:05:00.000Z",
  },
  {
    ...mainDiningScope,
    ...demoContainerWeights[2.5],
    id: "demo-main-inventory-03",
    trayId: mainDiningTrayIds.three,
    productName: "Demo Lemon-Lime Syrup",
    containerSizeGallons: 2.5,
    installedAt: "2026-01-15T08:10:00.000Z",
  },
  {
    ...mainDiningScope,
    ...demoContainerWeights[2.5],
    id: "demo-main-inventory-04",
    trayId: mainDiningTrayIds.four,
    productName: "Demo Orange Syrup",
    containerSizeGallons: 2.5,
    installedAt: "2026-01-15T08:15:00.000Z",
  },
  {
    ...mainDiningScope,
    ...demoContainerWeights[5],
    id: "demo-main-inventory-05",
    trayId: mainDiningTrayIds.five,
    productName: "Demo Root Beer Syrup",
    containerSizeGallons: 5,
    installedAt: "2026-01-15T08:20:00.000Z",
  },
] as const satisfies readonly InventoryItem[];

const mainDiningTelemetryReadings = [
  {
    ...mainDiningScope,
    id: "demo-main-reading-01",
    controllerId: mainDiningControllerId,
    trayId: mainDiningTrayIds.one,
    timestamp: "2026-01-15T12:00:00.000Z",
    grossWeightGrams: 19_650,
    dataSource: "simulated",
  },
  {
    ...mainDiningScope,
    id: "demo-main-reading-02",
    controllerId: mainDiningControllerId,
    trayId: mainDiningTrayIds.one,
    timestamp: "2026-01-15T12:10:00.000Z",
    grossWeightGrams: 23_400,
    dataSource: "simulated",
  },
  {
    ...mainDiningScope,
    id: "demo-main-reading-03",
    controllerId: mainDiningControllerId,
    trayId: mainDiningTrayIds.two,
    timestamp: "2026-01-15T12:10:00.000Z",
    grossWeightGrams: 13_400,
    dataSource: "simulated",
  },
  {
    ...mainDiningScope,
    id: "demo-main-reading-04",
    controllerId: mainDiningControllerId,
    trayId: mainDiningTrayIds.three,
    timestamp: "2026-01-15T12:10:00.000Z",
    grossWeightGrams: 3_100,
    dataSource: "simulated",
  },
  {
    ...mainDiningScope,
    id: "demo-main-reading-05",
    controllerId: mainDiningControllerId,
    trayId: mainDiningTrayIds.four,
    timestamp: "2026-01-15T12:10:00.000Z",
    grossWeightGrams: 13_100,
    dataSource: "simulated",
  },
  {
    ...mainDiningScope,
    id: "demo-main-reading-06",
    controllerId: mainDiningControllerId,
    trayId: mainDiningTrayIds.five,
    timestamp: "2026-01-15T12:10:00.000Z",
    grossWeightGrams: 5_900,
    dataSource: "simulated",
  },
] as const satisfies readonly TelemetryReading[];

const secondaryDiningControllers = [
  {
    ...secondaryDiningScope,
    id: secondaryDiningControllerId,
    name: "Secondary Dining Demo Controller",
    status: "online",
    lastSeenAt: "2026-01-15T12:05:00.000Z",
  },
] as const satisfies readonly Controller[];

const secondaryDiningSensorTrays = [
  {
    ...secondaryDiningScope,
    id: secondaryDiningTrayIds.one,
    controllerId: secondaryDiningControllerId,
    name: "Rack A / Position 1",
    family: "2.5-gallon",
    status: "ready",
  },
  {
    ...secondaryDiningScope,
    id: secondaryDiningTrayIds.two,
    controllerId: secondaryDiningControllerId,
    name: "Rack A / Position 2",
    family: "5-gallon",
    status: "ready",
  },
  {
    ...secondaryDiningScope,
    id: secondaryDiningTrayIds.three,
    controllerId: secondaryDiningControllerId,
    name: "Rack A / Position 3",
    family: "5-gallon",
    status: "ready",
  },
] as const satisfies readonly SensorTray[];

const secondaryDiningInventoryItems = [
  {
    ...secondaryDiningScope,
    ...demoContainerWeights[2.5],
    id: "demo-secondary-inventory-01",
    trayId: secondaryDiningTrayIds.one,
    productName: "Demo Cola Syrup",
    containerSizeGallons: 2.5,
    installedAt: "2026-01-15T09:00:00.000Z",
  },
  {
    ...secondaryDiningScope,
    ...demoContainerWeights[5],
    id: "demo-secondary-inventory-02",
    trayId: secondaryDiningTrayIds.two,
    productName: "Demo Lemon-Lime Syrup",
    containerSizeGallons: 5,
    installedAt: "2026-01-15T09:05:00.000Z",
  },
] as const satisfies readonly InventoryItem[];

const secondaryDiningTelemetryReadings = [
  {
    ...secondaryDiningScope,
    id: "demo-secondary-reading-01",
    controllerId: secondaryDiningControllerId,
    trayId: secondaryDiningTrayIds.one,
    timestamp: "2026-01-15T11:55:00.000Z",
    grossWeightGrams: 10_600,
    dataSource: "simulated",
  },
  {
    ...secondaryDiningScope,
    id: "demo-secondary-reading-02",
    controllerId: secondaryDiningControllerId,
    trayId: secondaryDiningTrayIds.one,
    timestamp: "2026-01-15T12:05:00.000Z",
    grossWeightGrams: 6_850,
    dataSource: "simulated",
  },
  {
    ...secondaryDiningScope,
    id: "demo-secondary-reading-03",
    controllerId: secondaryDiningControllerId,
    trayId: secondaryDiningTrayIds.two,
    timestamp: "2026-01-15T12:05:00.000Z",
    grossWeightGrams: 23_400,
    dataSource: "simulated",
  },
] as const satisfies readonly TelemetryReading[];

export const demoTelemetrySnapshots = [
  {
    ...mainDiningScope,
    dataSource: "simulated",
    controllers: mainDiningControllers,
    sensorTrays: mainDiningSensorTrays,
    inventoryItems: mainDiningInventoryItems,
    telemetryReadings: mainDiningTelemetryReadings,
  },
  {
    ...secondaryDiningScope,
    dataSource: "simulated",
    controllers: secondaryDiningControllers,
    sensorTrays: secondaryDiningSensorTrays,
    inventoryItems: secondaryDiningInventoryItems,
    telemetryReadings: secondaryDiningTelemetryReadings,
  },
] as const satisfies readonly LocationTelemetrySnapshot[];
