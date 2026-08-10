import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getInventoryLevelPresentation } from "../src/config/inventory-levels.ts";
import {
  deriveDemoPlanning,
  projectReplacementCount,
} from "../src/lib/analytics/derive-demo-planning.ts";
import { deriveInventoryState } from "../src/lib/inventory-calculations.ts";
import { deriveCurrentInventoryEntries } from "../src/lib/inventory/current-inventory.ts";
import { deriveDemoSnapshotAt } from "../src/lib/demo-simulation.ts";
import { demoTelemetrySnapshots } from "../src/lib/telemetry/demo-fixtures.ts";

const startedAt = "2026-08-09T12:00:00.000Z";
const baseline = demoTelemetrySnapshots.find(
  ({ locationId }) => locationId === "demo-union-hall",
);
assert.ok(baseline);

const atStart = deriveDemoSnapshotAt(baseline, startedAt, startedAt);
assert.equal(atStart, baseline);

const afterThirtySeconds = deriveDemoSnapshotAt(
  baseline,
  startedAt,
  "2026-08-09T12:00:30.000Z",
);
const repeated = deriveDemoSnapshotAt(
  baseline,
  startedAt,
  "2026-08-09T12:00:30.000Z",
);
assert.deepEqual(afterThirtySeconds, repeated);
assert.ok(
  afterThirtySeconds.telemetryReadings.some(
    (reading, index) =>
      reading.grossWeightGrams < baseline.telemetryReadings[index].grossWeightGrams,
  ),
);

const afterLongElapsedTime = deriveDemoSnapshotAt(
  baseline,
  startedAt,
  "2027-08-09T12:00:00.000Z",
);
for (const reading of afterLongElapsedTime.telemetryReadings) {
  const item = afterLongElapsedTime.inventoryItems.find(
    ({ trayId }) => trayId === reading.trayId,
  );
  assert.ok(item);
  assert.ok(reading.grossWeightGrams >= item.tareWeightGrams);
  const state = deriveInventoryState(reading, item);
  assert.ok(state.remainingPercentage !== null);
  assert.ok(state.remainingPercentage >= 0 && state.remainingPercentage <= 100);
}

const targetTrayId = "demo-union-hall-tray-r3-p8";
const targetItem = baseline.inventoryItems.find(
  ({ trayId }) => trayId === targetTrayId,
);
assert.ok(targetItem);
function targetPercentage(snapshot) {
  const reading = snapshot.telemetryReadings.find(
    ({ trayId }) => trayId === targetTrayId,
  );
  assert.ok(reading);
  return deriveInventoryState(reading, targetItem).remainingPercentage;
}
assert.equal(targetPercentage(baseline), 11);
const afterSixtySeconds = deriveDemoSnapshotAt(
  baseline,
  startedAt,
  "2026-08-09T12:01:00.000Z",
);
const crossedPercentage = targetPercentage(afterSixtySeconds);
assert.ok(crossedPercentage !== null && crossedPercentage <= 10);
assert.equal(
  getInventoryLevelPresentation(crossedPercentage).band,
  "replace",
);
const replacementCount = (snapshot) =>
  deriveCurrentInventoryEntries(snapshot).filter(({ inventoryItem, derivedState }) => {
    const percentage = derivedState?.remainingPercentage;
    return (
      inventoryItem &&
      percentage != null &&
      getInventoryLevelPresentation(percentage).band === "replace"
    );
  }).length;
assert.equal(replacementCount(baseline), 0);
assert.equal(replacementCount(afterSixtySeconds), 1);

const restarted = deriveDemoSnapshotAt(
  baseline,
  "2026-08-09T12:05:00.000Z",
  "2026-08-09T12:05:00.000Z",
);
assert.equal(restarted, baseline);

assert.equal(projectReplacementCount(50, 0, 30), 0);
assert.equal(projectReplacementCount(10, 2, 7), 1);
assert.equal(projectReplacementCount(100, 100, 2), 2);
assert.equal(projectReplacementCount(-10, -1, -1), 0);
assert.ok(Number.isFinite(projectReplacementCount(50, 4, 30)));
assert.deepEqual(
  deriveDemoPlanning(demoTelemetrySnapshots),
  deriveDemoPlanning(demoTelemetrySnapshots),
);

const source = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
for (const path of [
  "../src/components/layout/primary-navigation-items.tsx",
  "../src/components/layout/demo-context-controls.tsx",
  "../src/features/settings/settings.tsx",
]) {
  assert.match(source(path), /demoStartedAt/);
}
assert.doesNotMatch(source("../src/lib/demo-simulation.ts"), /Math\.random/);
assert.match(source("../src/components/telemetry/telemetry-auto-refresh.tsx"), /visibilitychange/);
assert.doesNotMatch(source("../src/features/product/production-home.tsx"), /Demo projection/);
const personaConfiguration = source("../src/config/demo-personas.ts");
assert.match(personaConfiguration, /id: "supervisor-manager"[\s\S]*?"\/analytics"/);
assert.match(personaConfiguration, /id: "organization-admin"[\s\S]*?"\/analytics"/);
assert.doesNotMatch(
  personaConfiguration.match(/id: "utility-worker"[\s\S]*?\n  },/)?.[0] ?? "",
  /"\/analytics"/,
);
assert.doesNotMatch(
  personaConfiguration.match(/id: "technician"[\s\S]*?\n  },/)?.[0] ?? "",
  /"\/analytics"/,
);

console.log(
  "Live demo verification passed (deterministic depletion, tare floor, threshold crossing, restart, URL clock, and planning math).",
);
