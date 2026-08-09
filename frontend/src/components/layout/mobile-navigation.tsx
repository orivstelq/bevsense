import { PrimaryNavigationItems } from "./primary-navigation-items";

export function MobileNavigation() {
  return (
    <nav
      aria-label="Primary navigation"
      className="border-b border-slate-200 bg-white lg:hidden"
    >
      <PrimaryNavigationItems variant="mobile" />
    </nav>
  );
}
