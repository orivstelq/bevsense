import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const sourceDirectory = fileURLToPath(new URL("src", root));

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}

const home = read("src/app/page.tsx");
const demoEntry = read("src/app/demo/page.tsx");
const demoResolver = read("src/lib/demo-context.ts");
const productEnvironment = read("src/lib/product-environment.ts");
const navigation = read("src/components/layout/primary-navigation-items.tsx");
const controls = read("src/components/layout/demo-context-controls.tsx");
const refresh = read("src/components/telemetry/telemetry-auto-refresh.tsx");
const brand = read("src/components/brand/bevsense-brand.tsx");
const inventoryTrayCard = read("src/features/inventory/inventory-tray-card.tsx");
const nextConfig = read("next.config.ts");
const sourceText = collectFiles(sourceDirectory)
  .filter((path) => /\.(ts|tsx)$/.test(path))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

assert.match(productEnvironment, /import "server-only"/);
assert.match(productEnvironment, /BIB_HARDWARE_CONNECTIONS_ENABLED/);
assert.match(productEnvironment, /\?\? "false"/);
assert.match(productEnvironment, /configuredValue === "true"/);
assert.match(productEnvironment, /configuredValue === "false"/);

assert.match(home, /isExplicitDemoMode/);
assert.ok(
  home.indexOf("if (!(await isExplicitDemoMode") <
    home.indexOf("const telemetry = await loadLocationTelemetry(scope)"),
  "The production root must gate telemetry loading behind explicit demo mode.",
);
assert.match(home, /ProductionHome/);
assert.match(demoResolver, /requestedMode !== "demo"/);
assert.match(demoResolver, /redirect\("\/"\)/);

assert.match(demoEntry, /BevSense Presentation/);
assert.match(demoEntry, /Start Demo/);
assert.match(demoEntry, /mode: "demo"/);
assert.match(demoEntry, /started: "1"/);
assert.match(navigation, /mode: "demo"/);
assert.match(controls, /mode: "demo"/);
assert.match(navigation, /location: locationId/);
assert.match(navigation, /persona: persona\.id/);
assert.match(controls, /Presentation mode \| Sign-in not required/);
assert.doesNotMatch(brand, /opacity="0\.28"/);
assert.doesNotMatch(inventoryTrayCard, /Simulated (reading|·)/);
assert.match(nextConfig, /devIndicators: false/);

assert.match(refresh, /setInterval/);
assert.match(refresh, /router\.refresh\(\)/);
assert.match(refresh, /visibilitychange/);
assert.match(refresh, /clearInterval/);
assert.doesNotMatch(refresh, /Auto-?refresh/);

for (const removedCopy of [
  ["Viewing", "Context"].join(" "),
  ["Viewing", "context"].join(" "),
  ["Demo", "context"].join(" "),
  ["CURRENT", "SNAPSHOT", "ANALYTICS"].join(" "),
  ["Current", "Snapshot", "Analytics"].join(" "),
  ["Beverage", "operations"].join(" "),
]) {
  assert.ok(!sourceText.includes(removedCopy), `Removed copy remains: ${removedCopy}`);
}

assert.doesNotMatch(sourceText, new RegExp(["NEXT", "PUBLIC.*BIB"].join("_")));

console.log(
  "Product experience verification passed (production gate, explicit demo flow, URL propagation, and background refresh).",
);
