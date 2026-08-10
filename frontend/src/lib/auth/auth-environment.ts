import "server-only";

const humanAuthEnvironmentVariable = "BIB_HUMAN_AUTH_ENABLED";
const selfSignupEnvironmentVariable = "BIB_SELF_SIGNUP_ENABLED";

export function getHumanAuthEnabled() {
  const value = process.env[humanAuthEnvironmentVariable] ?? "false";
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${humanAuthEnvironmentVariable} must be either true or false.`);
}

export function getSelfSignupEnabled() {
  const value = process.env[selfSignupEnvironmentVariable] ?? "false";
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${selfSignupEnvironmentVariable} must be either true or false.`);
}

export function getApplicationBaseUrl() {
  const configuredUrl = process.env.BIB_APP_BASE_URL ?? "http://localhost:3000";
  const url = new URL(configuredUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("BIB_APP_BASE_URL must be an HTTP(S) origin without credentials or a path.");
  }
  return url.origin;
}

export function getSupabaseAuthConfiguration() {
  const url = process.env.BIB_SUPABASE_URL;
  const publishableKey = process.env.BIB_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "BIB_SUPABASE_URL and BIB_SUPABASE_PUBLISHABLE_KEY are required when human authentication is enabled.",
    );
  }
  return { url, publishableKey } as const;
}
