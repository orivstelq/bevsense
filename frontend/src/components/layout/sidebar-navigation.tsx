import { PrimaryNavigationItems } from "./primary-navigation-items";

type SidebarNavigationProps = {
  locationId: string;
};

export function SidebarNavigation({ locationId }: SidebarNavigationProps) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-slate-950 text-slate-100 lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Beverage operations
        </p>
        <p className="mt-2 text-lg font-semibold tracking-tight">BiB Monitor</p>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
        <PrimaryNavigationItems locationId={locationId} variant="sidebar" />
      </nav>

      <div className="border-t border-slate-800 px-6 py-5">
        <p className="text-xs leading-5 text-slate-400">
          Hardware connections are not enabled in this environment.
        </p>
      </div>
    </aside>
  );
}
