import Link from "next/link";

import { navigationItems } from "@/config/navigation";

export function SidebarNavigation() {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-slate-950 text-slate-100 lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Beverage operations
        </p>
        <p className="mt-2 text-lg font-semibold tracking-tight">BiB Monitor</p>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.label}>
              {item.available ? (
                <Link
                  aria-current="page"
                  className="flex min-h-11 items-center rounded-md bg-slate-800 px-3 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-11 items-center justify-between rounded-md px-3 text-sm text-slate-400"
                >
                  {item.label}
                  <span className="text-xs text-slate-500">Planned</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800 px-6 py-5">
        <p className="text-xs leading-5 text-slate-400">
          Hardware connections are not enabled in this environment.
        </p>
      </div>
    </aside>
  );
}
