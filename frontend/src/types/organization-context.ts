import type { Location, Organization } from "./domain";

export type OrganizationContext = Readonly<{
  organization: Pick<Organization, "id" | "name">;
  location: Pick<Location, "id" | "organizationId" | "name">;
  isDemo: boolean;
}>;
