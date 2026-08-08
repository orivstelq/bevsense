import Link from "next/link";

import { navigationItems } from "@/config/navigation";

export function MobileNavigation() {
  return (
    <nav
      aria-label="Primary navigation"
      className="border-b border-slate-200 bg-white lg:hidden"
    >
      <ul className="grid grid-cols-5 px-1 sm:px-4">
        {navigationItems.map((item) => (
          <li className="min-w-0" key={item.label}>
            {item.available ? (
              <Link
                aria-current="page"
                className="flex min-h-12 items-center justify-center border-b-2 border-slate-900 px-1 text-[13px] font-semibold text-slate-950 outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 sm:px-3 sm:text-sm"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex min-h-12 items-center justify-center border-b-2 border-transparent px-1 text-[13px] text-slate-400 sm:px-3 sm:text-sm"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
