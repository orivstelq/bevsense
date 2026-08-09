import type {
  Controller,
  InventoryItem,
  Location,
  LocationScope,
  LocationTelemetrySnapshot,
  Organization,
  SensorTray,
  TelemetryDataSource,
  TelemetryReading,
} from "@/types/domain";

const schemaVersion = "1.0" as const;
const controllerStatuses = ["online", "offline", "unknown"] as const;
const trayStatuses = ["ready", "offline", "fault", "unknown"] as const;
const trayFamilies = ["2.5-gallon", "5-gallon"] as const;
const dataSources = ["simulated", "live"] as const;
const timezoneSuffix = /(?:Z|[+-]\d{2}:\d{2})$/;

type UnknownRecord = Record<string, unknown>;

export type TelemetryProviderErrorCode =
  | "configuration"
  | "backend-unavailable"
  | "timeout"
  | "snapshot-not-found"
  | "http-error"
  | "unsupported-schema"
  | "invalid-response";

export class TelemetryProviderError extends Error {
  readonly code: TelemetryProviderErrorCode;

  constructor(code: TelemetryProviderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "TelemetryProviderError";
  }
}

export interface TelemetryApiEnvelope extends LocationTelemetrySnapshot {
  readonly schemaVersion: typeof schemaVersion;
  readonly organization: Organization;
  readonly location: Location;
}

function invalid(message: string): never {
  throw new TelemetryProviderError("invalid-response", message);
}

function readObject(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(`${path} must be an object.`);
  }

  return value as UnknownRecord;
}

function readString(record: UnknownRecord, key: string, path: string) {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    invalid(`${path}.${key} must be a non-empty string.`);
  }

  return value;
}

function readOptionalString(
  record: UnknownRecord,
  key: string,
  path: string,
) {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    invalid(`${path}.${key} must be a non-empty string when present.`);
  }

  return value;
}

function readFiniteNumber(record: UnknownRecord, key: string, path: string) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalid(`${path}.${key} must be a finite number.`);
  }

  return value;
}

function readNonNegativeNumber(
  record: UnknownRecord,
  key: string,
  path: string,
) {
  const value = readFiniteNumber(record, key, path);
  if (value < 0) {
    invalid(`${path}.${key} must not be negative.`);
  }

  return value;
}

function readTimestamp(value: unknown, path: string) {
  if (
    typeof value !== "string" ||
    !timezoneSuffix.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    invalid(`${path} must be a timezone-aware ISO-8601 string.`);
  }

  return value;
}

function readEnum<const Values extends readonly string[]>(
  record: UnknownRecord,
  key: string,
  path: string,
  values: Values,
): Values[number] {
  const value = readString(record, key, path);
  if (!values.includes(value as Values[number])) {
    invalid(`${path}.${key} has an unsupported value.`);
  }

  return value as Values[number];
}

function readArray(record: UnknownRecord, key: string, path: string) {
  const value = record[key];
  if (!Array.isArray(value)) {
    invalid(`${path}.${key} must be an array.`);
  }

  return value;
}

function readScope(
  record: UnknownRecord,
  path: string,
  requestedScope: LocationScope,
) {
  const organizationId = readString(record, "organizationId", path);
  const locationId = readString(record, "locationId", path);

  if (
    organizationId !== requestedScope.organizationId ||
    locationId !== requestedScope.locationId
  ) {
    invalid(`${path} does not match the requested location scope.`);
  }

  return { organizationId, locationId } as const;
}

function parseController(
  value: unknown,
  index: number,
  requestedScope: LocationScope,
): Controller {
  const path = `response.controllers[${index}]`;
  const record = readObject(value, path);
  const lastSeenAt =
    record.lastSeenAt === null
      ? null
      : readTimestamp(record.lastSeenAt, `${path}.lastSeenAt`);
  const firmwareVersion = readOptionalString(record, "firmwareVersion", path);

  return {
    ...readScope(record, path, requestedScope),
    id: readString(record, "id", path),
    name: readString(record, "name", path),
    status: readEnum(record, "status", path, controllerStatuses),
    lastSeenAt,
    ...(firmwareVersion === undefined ? {} : { firmwareVersion }),
  };
}

function parseSensorTray(
  value: unknown,
  index: number,
  requestedScope: LocationScope,
): SensorTray {
  const path = `response.sensorTrays[${index}]`;
  const record = readObject(value, path);

  return {
    ...readScope(record, path, requestedScope),
    id: readString(record, "id", path),
    controllerId: readString(record, "controllerId", path),
    name: readString(record, "name", path),
    family: readEnum(record, "family", path, trayFamilies),
    status: readEnum(record, "status", path, trayStatuses),
  };
}

function parseInventoryItem(
  value: unknown,
  index: number,
  requestedScope: LocationScope,
): InventoryItem {
  const path = `response.inventoryItems[${index}]`;
  const record = readObject(value, path);
  const containerSizeGallons = readFiniteNumber(
    record,
    "containerSizeGallons",
    path,
  );
  const fullProductWeightGrams = readFiniteNumber(
    record,
    "fullProductWeightGrams",
    path,
  );

  if (containerSizeGallons !== 2.5 && containerSizeGallons !== 5) {
    invalid(`${path}.containerSizeGallons has an unsupported value.`);
  }
  if (fullProductWeightGrams <= 0) {
    invalid(`${path}.fullProductWeightGrams must be positive.`);
  }

  return {
    ...readScope(record, path, requestedScope),
    id: readString(record, "id", path),
    trayId: readString(record, "trayId", path),
    productName: readString(record, "productName", path),
    containerSizeGallons,
    tareWeightGrams: readNonNegativeNumber(record, "tareWeightGrams", path),
    fullProductWeightGrams,
    installedAt: readTimestamp(record.installedAt, `${path}.installedAt`),
  };
}

function parseTelemetryReading(
  value: unknown,
  index: number,
  requestedScope: LocationScope,
): TelemetryReading {
  const path = `response.telemetryReadings[${index}]`;
  const record = readObject(value, path);

  return {
    ...readScope(record, path, requestedScope),
    id: readString(record, "id", path),
    controllerId: readString(record, "controllerId", path),
    trayId: readString(record, "trayId", path),
    timestamp: readTimestamp(record.timestamp, `${path}.timestamp`),
    grossWeightGrams: readNonNegativeNumber(
      record,
      "grossWeightGrams",
      path,
    ),
    dataSource: readEnum(record, "dataSource", path, dataSources),
  };
}

function indexById<T extends { readonly id: string }>(
  records: readonly T[],
  path: string,
) {
  const indexed = new Map<string, T>();

  for (const record of records) {
    if (indexed.has(record.id)) {
      invalid(`${path} contains duplicate id ${record.id}.`);
    }
    indexed.set(record.id, record);
  }

  return indexed;
}

function validateReferences(envelope: TelemetryApiEnvelope) {
  const controllers = indexById(envelope.controllers, "response.controllers");
  const trays = indexById(envelope.sensorTrays, "response.sensorTrays");
  indexById(envelope.inventoryItems, "response.inventoryItems");
  indexById(envelope.telemetryReadings, "response.telemetryReadings");

  for (const tray of envelope.sensorTrays) {
    if (!controllers.has(tray.controllerId)) {
      invalid(`Sensor tray ${tray.id} references an unknown controller.`);
    }
  }

  for (const item of envelope.inventoryItems) {
    const tray = trays.get(item.trayId);
    if (!tray) {
      invalid(`Inventory item ${item.id} references an unknown tray.`);
    }
    const expectedFamily =
      item.containerSizeGallons === 2.5 ? "2.5-gallon" : "5-gallon";
    if (tray.family !== expectedFamily) {
      invalid(`Inventory item ${item.id} does not match its tray family.`);
    }
  }

  for (const reading of envelope.telemetryReadings) {
    const tray = trays.get(reading.trayId);
    if (!tray || !controllers.has(reading.controllerId)) {
      invalid(`Telemetry reading ${reading.id} references an unknown device.`);
    }
    if (tray.controllerId !== reading.controllerId) {
      invalid(`Telemetry reading ${reading.id} has an invalid device relationship.`);
    }
    if (reading.dataSource !== envelope.dataSource) {
      invalid(`Telemetry reading ${reading.id} has a mismatched dataSource.`);
    }
  }
}

export function parseTelemetryApiResponse(
  value: unknown,
  requestedScope: LocationScope,
): LocationTelemetrySnapshot {
  const response = readObject(value, "response");
  const receivedSchemaVersion = readString(
    response,
    "schemaVersion",
    "response",
  );

  if (receivedSchemaVersion !== schemaVersion) {
    throw new TelemetryProviderError(
      "unsupported-schema",
      `Unsupported telemetry schema version: ${receivedSchemaVersion}.`,
    );
  }

  const scope = readScope(response, "response", requestedScope);
  const organizationRecord = readObject(
    response.organization,
    "response.organization",
  );
  const locationRecord = readObject(response.location, "response.location");
  const organization: Organization = {
    id: readString(organizationRecord, "id", "response.organization"),
    name: readString(organizationRecord, "name", "response.organization"),
  };
  const location: Location = {
    id: readString(locationRecord, "id", "response.location"),
    organizationId: readString(
      locationRecord,
      "organizationId",
      "response.location",
    ),
    name: readString(locationRecord, "name", "response.location"),
  };

  if (
    organization.id !== scope.organizationId ||
    location.id !== scope.locationId ||
    location.organizationId !== scope.organizationId
  ) {
    invalid("Embedded organization or location does not match the requested scope.");
  }

  const dataSource: TelemetryDataSource = readEnum(
    response,
    "dataSource",
    "response",
    dataSources,
  );
  const controllers = readArray(response, "controllers", "response").map(
    (record, index) => parseController(record, index, scope),
  );
  const sensorTrays = readArray(response, "sensorTrays", "response").map(
    (record, index) => parseSensorTray(record, index, scope),
  );
  const inventoryItems = readArray(response, "inventoryItems", "response").map(
    (record, index) => parseInventoryItem(record, index, scope),
  );
  const telemetryReadings = readArray(
    response,
    "telemetryReadings",
    "response",
  ).map((record, index) => parseTelemetryReading(record, index, scope));

  const envelope: TelemetryApiEnvelope = {
    ...scope,
    schemaVersion,
    organization,
    location,
    dataSource,
    controllers,
    sensorTrays,
    inventoryItems,
    telemetryReadings,
  };

  validateReferences(envelope);

  return {
    organizationId: envelope.organizationId,
    locationId: envelope.locationId,
    dataSource: envelope.dataSource,
    controllers: envelope.controllers,
    sensorTrays: envelope.sensorTrays,
    inventoryItems: envelope.inventoryItems,
    telemetryReadings: envelope.telemetryReadings,
  };
}
