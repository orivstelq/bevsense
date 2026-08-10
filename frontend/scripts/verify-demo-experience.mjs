import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { demoLocations } from "../src/config/demo-context.ts";
import { demoPersonas } from "../src/config/demo-personas.ts";
import { getDemoTranslations } from "../src/config/demo-translations.ts";
import { getInventoryLevelPresentation } from "../src/config/inventory-levels.ts";
import { deriveInventoryState } from "../src/lib/inventory-calculations.ts";
import { demoTelemetrySnapshots } from "../src/lib/telemetry/demo-fixtures.ts";

const expectedLocations = [
  ["demo-the-hearth", "The Hearth"],
  ["demo-atrium-dining", "Atrium Dining"],
  ["demo-union-hall", "Union Hall"],
  ["demo-the-concourse", "The Concourse"],
];
const configuredLocations = Object.values(demoLocations);

assert.deepEqual(
  configuredLocations.map(({ id, name }) => [id, name]),
  expectedLocations,
);
assert.equal(demoTelemetrySnapshots.length, 4);

const replacementCounts = new Map();

for (const snapshot of demoTelemetrySnapshots) {
  assert.equal(snapshot.controllers.length, 1, snapshot.locationId);
  assert.equal(snapshot.sensorTrays.length, 30, snapshot.locationId);
  assert.equal(snapshot.inventoryItems.length, 30, snapshot.locationId);
  assert.equal(snapshot.telemetryReadings.length, 30, snapshot.locationId);

  const trayIds = new Set(snapshot.sensorTrays.map((tray) => tray.id));
  assert.equal(trayIds.size, 30, `${snapshot.locationId}: duplicate tray ID`);

  const rackPositions = new Set();
  const rackCounts = new Map([
    [1, 0],
    [2, 0],
    [3, 0],
  ]);

  for (const tray of snapshot.sensorTrays) {
    const match = /^Rack ([1-3]) \/ Position (10|[1-9])$/.exec(tray.name);
    assert.ok(match, `${snapshot.locationId}: malformed tray name ${tray.name}`);
    const rackNumber = Number(match[1]);
    const positionNumber = Number(match[2]);
    const rackPosition = `${rackNumber}:${positionNumber}`;
    assert.ok(
      !rackPositions.has(rackPosition),
      `${snapshot.locationId}: duplicate rack position ${rackPosition}`,
    );
    rackPositions.add(rackPosition);
    rackCounts.set(rackNumber, rackCounts.get(rackNumber) + 1);
  }

  assert.deepEqual([...rackCounts.values()], [10, 10, 10]);

  let replacementCount = 0;
  for (const item of snapshot.inventoryItems) {
    const tray = snapshot.sensorTrays.find(({ id }) => id === item.trayId);
    const reading = snapshot.telemetryReadings.find(
      ({ trayId }) => trayId === item.trayId,
    );
    assert.ok(tray, `${snapshot.locationId}: missing inventory tray`);
    assert.ok(reading, `${snapshot.locationId}: missing inventory reading`);
    assert.equal(tray.controllerId, reading.controllerId);
    assert.equal(
      item.containerSizeGallons,
      tray.family === "2.5-gallon" ? 2.5 : 5,
    );

    const { remainingPercentage } = deriveInventoryState(reading, item);
    assert.ok(remainingPercentage !== null);
    assert.ok(remainingPercentage >= 0 && remainingPercentage <= 100);
    if (getInventoryLevelPresentation(remainingPercentage).band === "replace") {
      replacementCount += 1;
    }
  }
  replacementCounts.set(snapshot.locationId, replacementCount);
}

for (const [percentage, band, color] of [
  [100, "healthy", "emerald"],
  [81, "healthy", "emerald"],
  [80.9, "monitor", "yellow"],
  [80, "monitor", "yellow"],
  [51, "monitor", "yellow"],
  [50.9, "low", "orange"],
  [50, "low", "orange"],
  [11, "low", "orange"],
  [10.9, "replace", "red"],
  [10, "replace", "red"],
  [0, "replace", "red"],
]) {
  const presentation = getInventoryLevelPresentation(percentage);
  assert.equal(presentation.band, band);
  assert.match(presentation.barClassName, new RegExp(color));
}

assert.equal(replacementCounts.get("demo-union-hall"), 0);
for (const locationId of [
  "demo-the-hearth",
  "demo-atrium-dining",
  "demo-the-concourse",
]) {
  assert.ok(replacementCounts.get(locationId) > 0, locationId);
}

const personaPages = Object.fromEntries(
  demoPersonas.map((persona) => [persona.id, persona.visiblePageHrefs]),
);
assert.deepEqual(personaPages["utility-worker"], [
  "/",
  "/inventory",
  "/alerts",
  "/settings",
]);
assert.deepEqual(personaPages["technician"], [
  "/",
  "/inventory",
  "/alerts",
  "/devices",
  "/settings",
]);
for (const personaId of ["supervisor-manager", "organization-admin"]) {
  assert.deepEqual(personaPages[personaId], [
    "/",
    "/inventory",
    "/alerts",
    "/devices",
    "/analytics",
    "/settings",
  ]);
}

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}
const sourceText = collectFiles(sourceRoot)
  .filter((path) => /\.(ts|tsx)$/.test(path))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
const controls = readFileSync(
  new URL("../src/components/layout/demo-context-controls.tsx", import.meta.url),
  "utf8",
);
const settings = readFileSync(
  new URL("../src/features/settings/settings.tsx", import.meta.url),
  "utf8",
);
const navigation = readFileSync(
  new URL("../src/components/layout/primary-navigation-items.tsx", import.meta.url),
  "utf8",
);
const alerts = readFileSync(
  new URL("../src/features/alerts/alerts.tsx", import.meta.url),
  "utf8",
);

assert.match(controls, /persona\.id === "utility-worker"/);
assert.match(settings, /mode: "demo"/);
assert.match(settings, /persona: persona\.id/);
assert.match(settings, /lang: nextLanguage/);
assert.match(navigation, /lang: language/);
assert.match(alerts, /level\?\.band === "replace"/);
assert.match(alerts, /copy\.allGood/);

const spanish = getDemoTranslations("es");
assert.equal(spanish.navigation.inventory, "Inventario");
assert.equal(spanish.navigation.alerts, "Alertas");
assert.equal(spanish.healthy, "Saludable");
assert.equal(spanish.monitor, "Supervisar");
assert.equal(spanish.low, "Bajo");
assert.equal(spanish.replace, "Reemplazar");

for (const oldLocation of [
  ["Main", "Dining"].join(" "),
  ["Secondary", "Dining"].join(" "),
]) {
  assert.ok(!sourceText.includes(oldLocation), `Old location remains: ${oldLocation}`);
}

console.log(
  `Demo experience verification passed: ${demoTelemetrySnapshots.length} locations, 30 positions each, replacements ${JSON.stringify(Object.fromEntries(replacementCounts))}.`,
);
