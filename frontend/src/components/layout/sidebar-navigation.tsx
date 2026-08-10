import type { DemoPersona } from "@/config/demo-personas";
import type { DemoLanguage } from "@/config/demo-translations";
import { BevSenseBrand } from "@/components/brand/bevsense-brand";

import { PrimaryNavigationItems } from "./primary-navigation-items";

type SidebarNavigationProps = {
  locationId: string;
  persona: DemoPersona;
  language: DemoLanguage;
};

export function SidebarNavigation({
  locationId,
  persona,
  language,
}: SidebarNavigationProps) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-slate-950 text-slate-100 lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <BevSenseBrand className="text-white" />
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
        <PrimaryNavigationItems
          locationId={locationId}
          persona={persona}
          language={language}
          variant="sidebar"
        />
      </nav>

      <div className="border-t border-slate-800 px-6 py-5">
        <p className="text-xs leading-5 text-slate-400">
          Demo mode uses simulated sensor data.
        </p>
      </div>
    </aside>
  );
}
