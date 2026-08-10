import "server-only";

import { loadAccessStatus } from "@/lib/auth/access-onboarding";
import type { HumanSessionState } from "@/types/access-onboarding";

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

export async function getValidatedHumanAccessToken() {
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data: claimsData, error } = await supabase.auth.getClaims();
    if (error || !claimsData?.claims) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedHumanAccount() {
  const accessToken = await getValidatedHumanAccessToken();
  if (!accessToken) return null;

  try {
    return (await loadHumanAccount(accessToken)).account;
  } catch {
    return null;
  }
}

export async function getHumanSessionState(): Promise<HumanSessionState> {
  const accessToken = await getValidatedHumanAccessToken();
  if (!accessToken) return { status: "signed-out" };

  try {
    const accountResult = await loadHumanAccount(accessToken);
    if (accountResult.account) {
      return { status: "active", account: accountResult.account, accessToken };
    }
    if (accountResult.status !== 403) {
      return { status: "unavailable", accessToken };
    }
    const accessStatus = await loadAccessStatus(accessToken);
    if (accessStatus.status === "active") {
      return { status: "unavailable", accessToken };
    }
    return {
      status: accessStatus.status,
      request: accessStatus.request,
      accessToken,
    };
  } catch {
    return { status: "unavailable", accessToken };
  }
}
