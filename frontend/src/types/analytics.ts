import type {
  LocationScope,
  TelemetryDataSource,
} from "./domain";

export interface CurrentInventoryLevel {
  readonly inventoryItemId: string;
  readonly trayId: string;
  readonly productName: string;
  readonly trayName: string;
  readonly remainingPercentage: number;
}

export interface SnapshotAnalytics extends LocationScope {
  readonly dataSource: TelemetryDataSource;
  readonly inventory: {
    readonly configuredTrayCount: number;
    readonly assignedInventoryCount: number;
    readonly unassignedTrayCount: number;
    readonly validInventoryLevelCount: number;
    readonly unavailableInventoryLevelCount: number;
    readonly averageRemainingPercentage: number | null;
    readonly lowestRemainingPercentage: number | null;
    readonly highestRemainingPercentage: number | null;
  };
  readonly trayFamilies: {
    readonly compact25GallonCount: number;
    readonly standard5GallonCount: number;
  };
  readonly telemetry: {
    readonly traysWithLatestReadingCount: number;
    readonly traysWithoutReadingCount: number;
    readonly assignedItemsWithReadingCount: number;
    readonly assignedItemsWithoutReadingCount: number;
    readonly trayCoveragePercentage: number | null;
  };
  readonly alerts: {
    readonly activeFindingCount: number;
    readonly warningFindingCount: number;
    readonly criticalFindingCount: number;
    readonly deviceFindingCount: number;
  };
  readonly currentInventoryLevels: readonly CurrentInventoryLevel[];
}
