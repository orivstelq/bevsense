import { PrimaryNavigationItems } from "./primary-navigation-items";

type MobileNavigationProps = {
  locationId: string;
};

export function MobileNavigation({ locationId }: MobileNavigationProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="border-b border-slate-200 bg-white lg:hidden"
    >
      <PrimaryNavigationItems locationId={locationId} variant="mobile" />
    </nav>
  );
}
