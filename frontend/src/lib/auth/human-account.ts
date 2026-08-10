import "server-only";

export type AuthenticatedRole =
  | "utility-worker"
  | "supervisor-manager"
  | "organization-admin"
  | "technician";

export type HumanAccount = {
  displayName: string;
  preferredLanguage: "en" | "es";
  memberships: readonly {
    organizationId: string;
    role: AuthenticatedRole;
    locationIds: readonly string[];
  }[];
};

function getApiBaseUrl() {
  return process.env.BIB_API_BASE_URL ?? "http://127.0.0.1:8000";
}

export async function loadHumanAccount(accessToken: string) {
  const response = await fetch(new URL("api/v1/me", `${getApiBaseUrl()}/`), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    return { status: response.status, account: null } as const;
  }
  return {
    status: 200,
    account: (await response.json()) as HumanAccount,
  } as const;
}

export async function getAuthenticatedHumanAccount() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  try {
    return (await loadHumanAccount(token)).account;
  } catch {
    return null;
  }
}
