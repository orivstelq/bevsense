import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const authEnvironment = read("../src/lib/auth/auth-environment.ts");
const loginActions = read("../src/app/login/actions.ts");
const proxy = read("../src/lib/supabase/proxy.ts");
const demoEntry = read("../src/app/demo/page.tsx");
const httpProvider = read("../src/lib/telemetry/http-provider.ts");
const productionHome = read("../src/features/product/production-home.tsx");
const humanAccount = read("../src/lib/auth/human-account.ts");
const home = read("../src/app/page.tsx");

assert.match(authEnvironment, /import "server-only"/);
assert.match(authEnvironment, /BIB_HUMAN_AUTH_ENABLED/);
assert.match(authEnvironment, /BIB_SUPABASE_URL/);
assert.match(authEnvironment, /BIB_SUPABASE_PUBLISHABLE_KEY/);
assert.doesNotMatch(authEnvironment, /NEXT_PUBLIC/);
assert.match(proxy, /getClaims\(\)/);
assert.match(loginActions, /signInWithPassword/);
assert.match(loginActions, /supabase\.auth\.signOut\(\)/);
assert.match(loginActions, /Unable to sign in with those credentials/);
assert.match(httpProvider, /Authorization: `Bearer/);
assert.match(productionHome, /hardwareConnectionsEnabled/);
assert.match(productionHome, /Live hardware data remains unavailable/);
assert.doesNotMatch(demoEntry, /HumanAuth|Supabase|login/);
assert.doesNotMatch(humanAccount, /persona/i);
assert.ok(
  home.indexOf("if (!(await isExplicitDemoMode") <
    home.indexOf("await resolveDemoContextFromSearchParams(searchParams"),
  "Production account resolution must remain separate from demo persona resolution.",
);

for (const forbidden of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "BIB_DATABASE_URL",
  "controller_token",
]) {
  assert.ok(!authEnvironment.includes(forbidden));
}

console.log(
  "Auth boundary verification passed (server-only config, Supabase SSR claims, generic login errors, bearer forwarding, logout, and public demo separation).",
);
