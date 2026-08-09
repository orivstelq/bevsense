"use client";

import { usePathname, useRouter } from "next/navigation";

import { demoLocations } from "@/config/demo-context";
import {
  demoPersonas,
  getDemoPersonaDestination,
  type DemoPersona,
} from "@/config/demo-personas";

type DemoContextControlsProps = {
  currentLocationId: string;
  persona: DemoPersona;
};

const locationOptions = Object.values(demoLocations);

export function DemoContextControls({
  currentLocationId,
  persona,
}: DemoContextControlsProps) {
  const pathname = usePathname();
  const router = useRouter();

  function navigate(locationId: string, nextPersona: DemoPersona) {
    const query = new URLSearchParams({
      location: locationId,
      persona: nextPersona.id,
    });
    const destination = getDemoPersonaDestination(nextPersona, pathname);

    router.push(`${destination}?${query.toString()}`);
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-x-3 gap-y-2 sm:w-auto sm:grid-cols-2">
      <div className="min-w-0">
        <label
          className="block text-xs font-semibold text-slate-600"
          htmlFor="demo-location"
        >
          Demo location
        </label>
        <select
          aria-describedby="demo-context-help"
          className="mt-1 min-h-11 w-full max-w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-48"
          id="demo-location"
          onChange={(event) =>
            navigate(event.currentTarget.value, persona)
          }
          value={currentLocationId}
        >
          {locationOptions.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label
          className="block text-xs font-semibold text-slate-600"
          htmlFor="demo-persona"
        >
          Demo persona
        </label>
        <select
          aria-describedby="demo-context-help"
          className="mt-1 min-h-11 w-full max-w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-48"
          id="demo-persona"
          onChange={(event) => {
            const nextPersona = demoPersonas.find(
              (candidate) => candidate.id === event.currentTarget.value,
            );

            if (nextPersona) {
              navigate(currentLocationId, nextPersona);
            }
          }}
          value={persona.id}
        >
          {demoPersonas.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p
        className="text-[11px] leading-4 text-slate-500 sm:col-span-2"
        id="demo-context-help"
      >
        Presentation only — not authentication
      </p>
    </div>
  );
}
