import type { Location, Organization } from "@/types/domain";
import type { OrganizationContext } from "@/types/organization-context";

export const demoOrganization = {
  id: "demo-organization",
  name: "Demo Organization",
} as const satisfies Organization;

export const demoLocations = {
  theHearth: {
    id: "demo-the-hearth",
    organizationId: demoOrganization.id,
    name: "The Hearth",
  },
  atriumDining: {
    id: "demo-atrium-dining",
    organizationId: demoOrganization.id,
    name: "Atrium Dining",
  },
  unionHall: {
    id: "demo-union-hall",
    organizationId: demoOrganization.id,
    name: "Union Hall",
  },
  theConcourse: {
    id: "demo-the-concourse",
    organizationId: demoOrganization.id,
    name: "The Concourse",
  },
} as const satisfies Record<
  "theHearth" | "atriumDining" | "unionHall" | "theConcourse",
  Location
>;

export const demoContext = {
  organization: demoOrganization,
  location: demoLocations.theHearth,
  isDemo: true,
} as const satisfies OrganizationContext;
