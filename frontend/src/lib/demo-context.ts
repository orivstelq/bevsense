import { notFound, redirect } from "next/navigation";

import {
  demoContext,
  demoLocations,
  demoOrganization,
} from "@/config/demo-context";
import type { LocationScope } from "@/types/domain";
import type { OrganizationContext } from "@/types/organization-context";

type DemoSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function resolveDemoContextFromSearchParams(
  searchParams: DemoSearchParams,
  pathname: string,
) {
  const { location: requestedLocationId } = await searchParams;

  if (requestedLocationId === undefined) {
    const query = new URLSearchParams({
      location: demoContext.location.id,
    });

    redirect(`${pathname}?${query.toString()}`);
  }

  if (typeof requestedLocationId !== "string") {
    notFound();
  }

  const location = Object.values(demoLocations).find(
    (candidate) => candidate.id === requestedLocationId,
  );

  if (!location) {
    notFound();
  }

  const context = {
    organization: demoOrganization,
    location,
    isDemo: true,
  } as const satisfies OrganizationContext;
  const scope = {
    organizationId: context.location.organizationId,
    locationId: context.location.id,
  } as const satisfies LocationScope;

  return { context, scope } as const;
}
