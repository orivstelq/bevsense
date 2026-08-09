"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/config/navigation";

type PrimaryNavigationItemsProps = {
  variant: "sidebar" | "mobile";
};

export function PrimaryNavigationItems({
  variant,
}: PrimaryNavigationItemsProps) {
  const pathname = usePathname();
  const isSidebar = variant === "sidebar";

  return (
    <ul className={isSidebar ? "space-y-1" : "grid grid-cols-5 px-1 sm:px-4"}>
      {navigationItems.map((item) => {
        const isActive = item.available && pathname === item.href;

        return (
          <li className={isSidebar ? undefined : "min-w-0"} key={item.label}>
            {item.available ? (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={
                  isSidebar
                    ? `flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isActive
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }`
                    : `flex min-h-12 items-center justify-center border-b-2 px-1 text-[13px] outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 sm:px-3 sm:text-sm ${
                        isActive
                          ? "border-slate-900 font-semibold text-slate-950"
                          : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
                      }`
                }
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={
                  isSidebar
                    ? "flex min-h-11 items-center justify-between rounded-md px-3 text-sm text-slate-400"
                    : "flex min-h-12 items-center justify-center border-b-2 border-transparent px-1 text-[13px] text-slate-400 sm:px-3 sm:text-sm"
                }
              >
                {item.label}
                {isSidebar && (
                  <span className="text-xs text-slate-500">Planned</span>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
