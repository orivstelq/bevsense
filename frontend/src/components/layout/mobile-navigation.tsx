import type { DemoPersona } from "@/config/demo-personas";

import { PrimaryNavigationItems } from "./primary-navigation-items";

type MobileNavigationProps = {
  locationId: string;
  persona: DemoPersona;
};

export function MobileNavigation({
  locationId,
  persona,
}: MobileNavigationProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="border-b border-slate-200 bg-white lg:hidden"
    >
      <PrimaryNavigationItems
        locationId={locationId}
        persona={persona}
        variant="mobile"
      />
    </nav>
  );
}
