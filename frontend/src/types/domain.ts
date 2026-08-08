export type Iso8601Timestamp = string;

export type ControllerStatus = "online" | "offline" | "unknown";
export type SensorTrayStatus = "ready" | "offline" | "fault" | "unknown";
export type SensorTrayFamily = "2.5-gallon" | "5-gallon";
export type ContainerSizeGallons = 2.5 | 5;
export type TelemetryDataSource = "simulated" | "live";

export interface Organization {
  readonly id: string;
  readonly name: string;
}

export interface Location {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
}

export interface LocationScope {
  readonly organizationId: string;
  readonly locationId: string;
}

export interface Controller extends LocationScope {
  readonly id: string;
  readonly name: string;
  readonly status: ControllerStatus;
  readonly lastSeenAt: Iso8601Timestamp | null;
  readonly firmwareVersion?: string;
}

export interface SensorTray extends LocationScope {
  readonly id: string;
  readonly controllerId: string;
  readonly name: string;
  readonly family: SensorTrayFamily;
  readonly status: SensorTrayStatus;
}

export interface InventoryItem extends LocationScope {
  readonly id: string;
  readonly trayId: string;
  readonly productName: string;
  readonly containerSizeGallons: ContainerSizeGallons;
  readonly tareWeightGrams: number;
  readonly fullProductWeightGrams: number;
  readonly installedAt: Iso8601Timestamp;
}

export interface TelemetryReading extends LocationScope {
  readonly id: string;
  readonly controllerId: string;
  readonly trayId: string;
  readonly timestamp: Iso8601Timestamp;
  readonly grossWeightGrams: number;
  readonly dataSource: TelemetryDataSource;
}

export interface LocationTelemetrySnapshot extends LocationScope {
  readonly dataSource: TelemetryDataSource;
  readonly controllers: readonly Controller[];
  readonly sensorTrays: readonly SensorTray[];
  readonly inventoryItems: readonly InventoryItem[];
  readonly telemetryReadings: readonly TelemetryReading[];
}
