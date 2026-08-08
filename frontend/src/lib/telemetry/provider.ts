import type {
  LocationScope,
  LocationTelemetrySnapshot,
  TelemetryDataSource,
} from "@/types/domain";

export interface TelemetryProvider {
  readonly dataSource: TelemetryDataSource;
  getSnapshot(scope: LocationScope): Promise<LocationTelemetrySnapshot>;
}
