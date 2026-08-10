import type { DemoPersona } from "@/config/demo-personas";
import type { DemoLanguage } from "@/config/demo-translations";
import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { TelemetryAutoRefresh } from "@/components/telemetry/telemetry-auto-refresh";
import type { OrganizationContext } from "@/types/organization-context";

import { DemoContextControls } from "./demo-context-controls";

type TopHeaderProps = {
  context: OrganizationContext;
  persona: DemoPersona;
  language: DemoLanguage;
};

export function TopHeader({ context, language, persona }: TopHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <BevSenseBrand className="mb-3 text-slate-950 lg:hidden" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Organization
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {context.organization.name}
          </p>
        </div>

        <DemoContextControls
          currentLocationId={context.location.id}
          language={language}
          persona={persona}
        />

        <TelemetryAutoRefresh />

        <div
          aria-label="Simulation mode is active"
          className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold tracking-[0.08em] text-amber-900"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
          SIMULATION MODE
        </div>
      </div>
    </header>
  );
}
