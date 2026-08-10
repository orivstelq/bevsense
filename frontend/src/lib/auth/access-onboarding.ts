import "server-only";

import type { User } from "@supabase/supabase-js";

import type {
  AccessRequest,
  AccessRequestReview,
  AccessRequestSubmission,
  AccessStatus,
  SelfServiceRole,
  SignupOptions,
} from "@/types/access-onboarding";

const requestTimeoutMs = 5_000;
const selfServiceRoles = new Set<SelfServiceRole>([
  "utility-worker",
  "supervisor-manager",
  "technician",
]);

export class AccessOnboardingApiError extends Error {
  constructor(public readonly status: number | null) {
    super("The BevSense access service is unavailable.");
    this.name = "AccessOnboardingApiError";
  }
}

function apiUrl(path: string) {
  const baseUrl = process.env.BIB_API_BASE_URL ?? "http://127.0.0.1:8000";
  return new URL(path, `${baseUrl.replace(/\/$/, "")}/`);
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw new AccessOnboardingApiError(null);
  }
  if (!response.ok) {
    throw new AccessOnboardingApiError(response.status);
  }
  return (await response.json()) as T;
}

export function loadSignupOptions() {
  return requestJson<SignupOptions>("api/v1/public/signup-options");
}

export function loadAccessStatus(accessToken: string) {
  return requestJson<AccessStatus>(
    "api/v1/account/access-status",
    {},
    accessToken,
  );
}

export function submitAccessRequest(
  accessToken: string,
  request: AccessRequestSubmission,
) {
  return requestJson<AccessRequest>(
    "api/v1/account/access-request",
    { method: "POST", body: JSON.stringify(request) },
    accessToken,
  );
}

export function loadAccessRequestReview(accessToken: string) {
  return requestJson<AccessRequestReview>(
    "api/v1/access-requests?status=pending",
    {},
    accessToken,
  );
}

export function approveAccessRequest(
  accessToken: string,
  requestId: string,
  approvedRole: SelfServiceRole,
  approvedLocationId: string,
) {
  return requestJson<AccessRequest>(
    `api/v1/access-requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ approvedRole, approvedLocationId }),
    },
    accessToken,
  );
}

export function rejectAccessRequest(
  accessToken: string,
  requestId: string,
  reviewNote: string | null,
) {
  return requestJson<AccessRequest>(
    `api/v1/access-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reviewNote }),
    },
    accessToken,
  );
}

export async function ensureAccessRequestFromMetadata(
  accessToken: string,
  user: User,
) {
  const request = accessRequestFromMetadata(user);
  if (!request) return false;
  await submitAccessRequest(accessToken, request);
  return true;
}

function accessRequestFromMetadata(
  user: User,
): AccessRequestSubmission | null {
  const fullName = user.user_metadata.full_name;
  const organizationId = user.user_metadata.requested_organization_id;
  const locationId = user.user_metadata.requested_location_id;
  const requestedRole = user.user_metadata.requested_role;
  if (
    typeof fullName !== "string" ||
    typeof organizationId !== "string" ||
    typeof locationId !== "string" ||
    typeof requestedRole !== "string" ||
    !selfServiceRoles.has(requestedRole as SelfServiceRole)
  ) {
    return null;
  }
  return {
    fullName,
    organizationId,
    locationId,
    requestedRole: requestedRole as SelfServiceRole,
  };
}

export function hasAccessRequestMetadata(user: User) {
  return accessRequestFromMetadata(user) !== null;
}
