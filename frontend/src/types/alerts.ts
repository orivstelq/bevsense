import type {
  ControllerStatus,
  Iso8601Timestamp,
  LocationScope,
  SensorTrayStatus,
  TelemetryDataSource,
} from "./domain";

export type AlertSeverity = "warning" | "critical";

export type AlertKind =
  | "low-inventory"
  | "telemetry-unavailable"
  | "controller-status"
  | "tray-status";

export interface DerivedAlertFinding extends LocationScope {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly kind: AlertKind;
  readonly title: string;
  readonly description: string;
  readonly assetLabel: string;
  readonly observedAt: Iso8601Timestamp | null;
  readonly dataSource: TelemetryDataSource;
  readonly inventoryItemId?: string;
  readonly trayId?: string;
  readonly controllerId?: string;
}

export interface AlertPolicy {
  readonly name: string;
  readonly inventory: {
    readonly criticalAtOrBelowPercentage: number;
    readonly warningAtOrBelowPercentage: number;
  };
  readonly controllerStatus: Readonly<
    Record<ControllerStatus, AlertSeverity | null>
  >;
  readonly trayStatus: Readonly<
    Record<SensorTrayStatus, AlertSeverity | null>
  >;
}
