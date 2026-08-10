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
const startDemoButton = read("src/components/demo/start-demo-button.tsx");
const demoResolver = read("src/lib/demo-context.ts");
const productEnvironment = read("src/lib/product-environment.ts");
const navigation = read("src/components/layout/primary-navigation-items.tsx");
const navigationConfiguration = read("src/config/navigation.ts");
const controls = read("src/components/layout/demo-context-controls.tsx");
const translations = read("src/config/demo-translations.ts");
const refresh = read("src/components/telemetry/telemetry-auto-refresh.tsx");
const brand = read("src/components/brand/bevsense-brand.tsx");
const sidebar = read("src/components/layout/sidebar-navigation.tsx");
const topHeader = read("src/components/layout/top-header.tsx");
const productionHome = read("src/features/product/production-home.tsx");
const loginPage = read("src/app/login/page.tsx");
const notFoundPage = read("src/app/not-found.tsx");
const authProxy = read("src/lib/supabase/proxy.ts");
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
    home.indexOf("const telemetry = await loadDemoLocationTelemetry"),
  "The production root must gate telemetry loading behind explicit demo mode.",
);
assert.match(home, /ProductionHome/);
assert.match(demoResolver, /requestedMode !== "demo"/);
assert.match(demoResolver, /redirect\("\/"\)/);

assert.match(demoEntry, /BevSense Presentation/);
assert.match(demoEntry, /StartDemoButton/);
assert.match(startDemoButton, /Start Demo/);
assert.match(startDemoButton, /mode: "demo"/);
assert.match(startDemoButton, /started: "1"/);
assert.match(startDemoButton, /demoStartedAt: new Date\(\)\.toISOString\(\)/);
assert.match(demoResolver, /demoStartedAt/);
assert.match(navigation, /demoStartedAt/);
assert.match(controls, /demoStartedAt/);
assert.match(navigation, /mode: "demo"/);
assert.match(controls, /mode: "demo"/);
assert.match(navigation, /location: locationId/);
assert.match(navigation, /persona: persona\.id/);
assert.match(navigation, /useLinkStatus/);
assert.match(navigation, /<Link/);
assert.match(navigation, /min-h-(11|12)/);
assert.doesNotMatch(navigation, /preventDefault|router\.(push|replace)/);
assert.doesNotMatch(navigation, /started:/);
for (const href of ["/", "/inventory", "/alerts", "/devices", "/analytics", "/settings"]) {
  assert.ok(
    navigationConfiguration.includes(`href: "${href}"`),
    `Navigation configuration is missing ${href}.`,
  );
}

assert.match(brand, /import Link from "next\/link"/);
assert.match(brand, /aria-label="BevSense home"/);
assert.match(brand, /href="\/"/);
assert.doesNotMatch(brand, /mode|location|persona|demoStartedAt|started/);
for (const placement of [
  sidebar,
  topHeader,
  productionHome,
  demoEntry,
  loginPage,
  notFoundPage,
]) {
  assert.match(placement, /<BevSenseBrand/);
}
assert.match(notFoundPage, /href="\/"[\s\S]*Back to BevSense/);
assert.match(translations, /Presentation mode \| Sign-in not required/);
assert.doesNotMatch(brand, /opacity="0\.28"/);
assert.doesNotMatch(inventoryTrayCard, /Simulated (reading|·)/);
assert.match(nextConfig, /devIndicators: false/);

assert.match(refresh, /setInterval/);
assert.match(refresh, /router\.refresh\(\)/);
assert.match(refresh, /visibilitychange/);
assert.match(refresh, /clearInterval/);
assert.doesNotMatch(refresh, /Auto-?refresh/);
assert.doesNotMatch(refresh, /router\.(push|replace)|usePathname|useSearchParams/);

assert.ok(
  authProxy.indexOf('process.env.BIB_HUMAN_AUTH_ENABLED !== "true"') <
    authProxy.indexOf("createServerClient("),
  "Disabled human auth must return before Supabase client or network work.",
);

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
