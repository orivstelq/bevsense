import type { OrganizationContext } from "@/types/organization-context";

type TopHeaderProps = {
  context: OrganizationContext;
};

export function TopHeader({ context }: TopHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-base font-semibold tracking-tight text-slate-950 lg:hidden">
            BiB Monitor
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Viewing context
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-slate-900">
              <span className="sr-only">Organization: </span>
              {context.organizationName}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span className="text-slate-600">
              <span className="sr-only">Location: </span>
              {context.locationName}
            </span>
            {context.isDemo && (
              <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Demo context
              </span>
            )}
          </div>
        </div>

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
