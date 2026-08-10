import "server-only";

const humanAuthEnvironmentVariable = "BIB_HUMAN_AUTH_ENABLED";

export function getHumanAuthEnabled() {
  const value = process.env[humanAuthEnvironmentVariable] ?? "false";
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${humanAuthEnvironmentVariable} must be either true or false.`);
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
