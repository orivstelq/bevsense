"use client";

import { usePathname, useRouter } from "next/navigation";

import { demoLocations } from "@/config/demo-context";

type DemoLocationSwitcherProps = {
  currentLocationId: string;
};

const locationOptions = Object.values(demoLocations);

export function DemoLocationSwitcher({
  currentLocationId,
}: DemoLocationSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="w-full min-w-0 sm:w-auto">
      <label
        className="block text-xs font-semibold text-slate-600"
        htmlFor="demo-location"
      >
        Demo location
      </label>
      <select
        aria-describedby="demo-location-help"
        className="mt-1 min-h-11 w-full max-w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-48"
        id="demo-location"
        onChange={(event) => {
          const query = new URLSearchParams({
            location: event.currentTarget.value,
          });

          router.push(`${pathname}?${query.toString()}`);
        }}
        value={currentLocationId}
      >
        {locationOptions.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-slate-500" id="demo-location-help">
        Demo Mode selection
      </p>
    </div>
  );
}
