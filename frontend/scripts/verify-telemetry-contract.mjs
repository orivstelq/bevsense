import assert from "node:assert/strict";

import {
  parseTelemetryApiResponse,
  TelemetryProviderError,
} from "../src/lib/telemetry/api-contract.ts";

const scope = {
  organizationId: "demo-organization",
  locationId: "demo-main-dining",
};
const validPayload = {
  ...scope,
  schemaVersion: "1.0",
  organization: { id: scope.organizationId, name: "Demo Organization" },
  location: {
    id: scope.locationId,
    organizationId: scope.organizationId,
    name: "Main Dining",
  },
  dataSource: "simulated",
  controllers: [
    {
      ...scope,
      id: "controller-1",
      name: "Demo Controller",
      status: "online",
      lastSeenAt: "2026-01-15T12:00:00Z",
    },
  ],
  sensorTrays: [
    {
      ...scope,
      id: "tray-1",
      controllerId: "controller-1",
      name: "Position 1",
      family: "5-gallon",
      status: "ready",
    },
  ],
  inventoryItems: [
    {
      ...scope,
      id: "inventory-1",
      trayId: "tray-1",
      productName: "Demo Syrup",
      containerSizeGallons: 5,
      tareWeightGrams: 900,
      fullProductWeightGrams: 25_000,
      installedAt: "2026-01-15T08:00:00Z",
    },
  ],
  telemetryReadings: [
    {
      ...scope,
      id: "reading-1",
      controllerId: "controller-1",
      trayId: "tray-1",
      timestamp: "2026-01-15T12:00:00Z",
      grossWeightGrams: 20_000,
      dataSource: "simulated",
    },
  ],
};

assert.deepEqual(parseTelemetryApiResponse(validPayload, scope), {
  organizationId: scope.organizationId,
  locationId: scope.locationId,
  dataSource: "simulated",
  controllers: validPayload.controllers,
  sensorTrays: validPayload.sensorTrays,
  inventoryItems: validPayload.inventoryItems,
  telemetryReadings: validPayload.telemetryReadings,
});

const rejectionCases = [
  ["wrong schema", (payload) => (payload.schemaVersion = "2.0"), "unsupported-schema"],
  ["wrong organization", (payload) => (payload.organizationId = "other"), "invalid-response"],
  ["wrong location", (payload) => (payload.locationId = "other"), "invalid-response"],
  ["invalid source", (payload) => (payload.dataSource = "unknown"), "invalid-response"],
  ["malformed array", (payload) => (payload.controllers = {}), "invalid-response"],
  [
    "malformed record",
    (payload) => (payload.sensorTrays[0].status = "broken"),
    "invalid-response",
  ],
  [
    "invalid reference",
    (payload) => (payload.telemetryReadings[0].trayId = "missing"),
    "invalid-response",
  ],
];

for (const [name, mutate, expectedCode] of rejectionCases) {
  const payload = structuredClone(validPayload);
  mutate(payload);

  assert.throws(
    () => parseTelemetryApiResponse(payload, scope),
    (error) =>
      error instanceof TelemetryProviderError && error.code === expectedCode,
    name,
  );
}

console.log(`Telemetry contract verification passed (${rejectionCases.length} rejection cases).`);
