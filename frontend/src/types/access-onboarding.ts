import type { AuthenticatedRole, HumanAccount } from "@/lib/auth/human-account";

export type SelfServiceRole = Exclude<AuthenticatedRole, "organization-admin">;
export type AccessRequestStatus = "pending" | "approved" | "rejected";

export type SignupOrganization = {
  id: string;
  name: string;
};

export type SignupLocation = {
  id: string;
  organizationId: string;
  name: string;
};

export type SignupOptions = {
  organizations: SignupOrganization[];
  locations: SignupLocation[];
};

export type AccessRequest = {
  id: string;
  verifiedEmail: string;
  fullName: string;
  requestedOrganizationId: string;
  requestedOrganizationName: string;
  requestedLocationId: string;
  requestedLocationName: string;
  requestedRole: SelfServiceRole;
  status: AccessRequestStatus;
  approvedRole: SelfServiceRole | null;
  approvedLocationId: string | null;
  approvedLocationName: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccessStatus = {
  status: "active" | "pending" | "rejected" | "no-request";
  request: AccessRequest | null;
};

export type AccessRequestReview = {
  requests: AccessRequest[];
  locations: SignupLocation[];
};

export type HumanSessionState =
  | { status: "signed-out" }
  | { status: "active"; account: HumanAccount; accessToken: string }
  | {
      status: "pending" | "rejected" | "no-request";
      request: AccessRequest | null;
      accessToken: string;
    }
  | { status: "unavailable"; accessToken: string };

export type AccessRequestSubmission = {
  fullName: string;
  organizationId: string;
  locationId: string;
  requestedRole: SelfServiceRole;
};
