import { notFound, redirect } from "next/navigation";

import {
  demoContext,
  demoLocations,
  demoOrganization,
} from "@/config/demo-context";
import {
  defaultDemoPersona,
  findDemoPersona,
  getDemoPersonaDestination,
} from "@/config/demo-personas";
import type { LocationScope } from "@/types/domain";
import type { OrganizationContext } from "@/types/organization-context";

type DemoSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function resolveDemoContextFromSearchParams(
  searchParams: DemoSearchParams,
  pathname: string,
) {
  const params = await searchParams;
  const {
    location: requestedLocationId,
    persona: requestedPersonaId,
  } = params;

  if (
    (requestedLocationId !== undefined &&
      typeof requestedLocationId !== "string") ||
    (requestedPersonaId !== undefined &&
      typeof requestedPersonaId !== "string")
  ) {
    notFound();
  }

  const locationId = requestedLocationId ?? demoContext.location.id;
  const personaId = requestedPersonaId ?? defaultDemoPersona.id;

  const location = Object.values(demoLocations).find(
    (candidate) => candidate.id === locationId,
  );
  const persona = findDemoPersona(personaId);

  if (!location || !persona) {
    notFound();
  }

  const query = new URLSearchParams({
    location: location.id,
    persona: persona.id,
  });
  const destination = getDemoPersonaDestination(persona, pathname);
  const hasUnsupportedParams = Object.keys(params).some(
    (key) => key !== "location" && key !== "persona",
  );

  if (
    requestedLocationId === undefined ||
    requestedPersonaId === undefined ||
    hasUnsupportedParams ||
    destination !== pathname
  ) {
    redirect(`${destination}?${query.toString()}`);
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

  return { context, persona, scope } as const;
}
