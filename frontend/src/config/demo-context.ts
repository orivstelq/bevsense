import type { Location, Organization } from "@/types/domain";
import type { OrganizationContext } from "@/types/organization-context";

export const demoOrganization = {
  id: "demo-organization",
  name: "Demo Organization",
} as const satisfies Organization;

export const demoLocations = {
  mainDining: {
    id: "demo-main-dining",
    organizationId: demoOrganization.id,
    name: "Main Dining",
  },
  secondaryDining: {
    id: "demo-secondary-dining",
    organizationId: demoOrganization.id,
    name: "Secondary Dining",
  },
} as const satisfies Record<"mainDining" | "secondaryDining", Location>;

export const demoContext = {
  organization: demoOrganization,
  location: demoLocations.mainDining,
  isDemo: true,
} as const satisfies OrganizationContext;
