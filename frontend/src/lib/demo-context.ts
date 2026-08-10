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
import {
  isDemoLanguage,
  type DemoLanguage,
} from "@/config/demo-translations";
import type { LocationScope } from "@/types/domain";
import type { OrganizationContext } from "@/types/organization-context";

type DemoSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function isExplicitDemoMode(searchParams: DemoSearchParams) {
  const { mode } = await searchParams;
  return mode === "demo";
}

export async function resolveDemoContextFromSearchParams(
  searchParams: DemoSearchParams,
  pathname: string,
) {
  const params = await searchParams;
  const {
    mode: requestedMode,
    location: requestedLocationId,
    persona: requestedPersonaId,
    lang: requestedLanguage,
    started: requestedStarted,
  } = params;

  if (requestedMode !== "demo") {
    redirect("/");
  }

  if (
    (requestedLocationId !== undefined &&
      typeof requestedLocationId !== "string") ||
    (requestedPersonaId !== undefined &&
      typeof requestedPersonaId !== "string") ||
    (requestedLanguage !== undefined &&
      typeof requestedLanguage !== "string") ||
    (requestedStarted !== undefined && requestedStarted !== "1")
  ) {
    notFound();
  }

  const locationId = requestedLocationId ?? demoContext.location.id;
  const personaId = requestedPersonaId ?? defaultDemoPersona.id;
  const languageValue = requestedLanguage ?? "en";

  const location = Object.values(demoLocations).find(
    (candidate) => candidate.id === locationId,
  );
  const persona = findDemoPersona(personaId);
  const language: DemoLanguage | null = isDemoLanguage(languageValue)
    ? languageValue
    : null;

  if (!location || !persona || !language) {
    notFound();
  }

  const query = new URLSearchParams({
    mode: "demo",
    location: location.id,
    persona: persona.id,
    lang: language,
  });
  if (requestedStarted === "1") {
    query.set("started", "1");
  }
  const destination = getDemoPersonaDestination(persona, pathname);
  const hasUnsupportedParams = Object.keys(params).some(
    (key) =>
      key !== "mode" &&
      key !== "location" &&
      key !== "persona" &&
      key !== "lang" &&
      key !== "started",
  );

  if (
    requestedLocationId === undefined ||
    requestedPersonaId === undefined ||
    requestedLanguage === undefined ||
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

  return {
    context,
    persona,
    language,
    scope,
    showDemoStarted: requestedStarted === "1",
  } as const;
}
