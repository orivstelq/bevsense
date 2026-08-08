import type { OrganizationContext } from "@/types/organization-context";

export const demoContext = {
  organizationName: "Demo Organization",
  locationName: "Main Dining",
  isDemo: true,
} as const satisfies OrganizationContext;
