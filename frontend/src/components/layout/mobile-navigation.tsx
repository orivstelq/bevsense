import type { DemoPersona } from "@/config/demo-personas";
import type { DemoLanguage } from "@/config/demo-translations";

import { PrimaryNavigationItems } from "./primary-navigation-items";

type MobileNavigationProps = {
  locationId: string;
  persona: DemoPersona;
  language: DemoLanguage;
};

export function MobileNavigation({
  locationId,
  persona,
  language,
}: MobileNavigationProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="border-b border-slate-200 bg-white lg:hidden"
    >
      <PrimaryNavigationItems
        locationId={locationId}
        persona={persona}
        language={language}
        variant="mobile"
      />
    </nav>
  );
}
