"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { DemoPersona } from "@/config/demo-personas";
import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { navigationItems } from "@/config/navigation";

type PrimaryNavigationItemsProps = {
  locationId: string;
  persona: DemoPersona;
  language: DemoLanguage;
  variant: "sidebar" | "mobile";
};

function NavigationPendingIndicator({ sidebar }: { sidebar: boolean }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute right-2 top-2 size-1.5 rounded-full transition-opacity duration-150 motion-reduce:transition-none ${
          pending
            ? sidebar
              ? "bg-amber-300 opacity-100"
              : "bg-amber-600 opacity-100"
            : "opacity-0"
        }`}
      />
      <span aria-live="polite" className="sr-only">
        {pending ? "Loading" : ""}
      </span>
    </>
  );
}

export function PrimaryNavigationItems({
  locationId,
  persona,
  language,
  variant,
}: PrimaryNavigationItemsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSidebar = variant === "sidebar";
  const copy = getDemoTranslations(language);
  const visibleItems = navigationItems.filter((item) =>
    persona.visiblePageHrefs.some((href) => href === item.href),
  );

  return (
    <ul
      className={isSidebar ? "space-y-1" : "grid px-1 sm:px-4"}
      style={
        isSidebar
          ? undefined
          : {
              gridTemplateColumns: `repeat(${visibleItems.length <= 4 ? visibleItems.length : 3}, minmax(0, 1fr))`,
            }
      }
    >
      {visibleItems.map((item) => {
        const isActive = item.available && pathname === item.href;

        return (
          <li className={isSidebar ? undefined : "min-w-0"} key={item.label}>
            {item.available ? (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={
                  isSidebar
                    ? `relative flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none transition-colors duration-150 active:bg-slate-700 focus-visible:ring-2 focus-visible:ring-amber-400 motion-reduce:transition-none ${
                        isActive
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }`
                    : `relative flex min-h-12 items-center justify-center border-b-2 px-1 text-[13px] outline-none transition-colors duration-150 active:bg-slate-100 focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 motion-reduce:transition-none sm:px-3 sm:text-sm ${
                        isActive
                          ? "border-slate-900 font-semibold text-slate-950"
                          : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
                      }`
                }
                href={{
                  pathname: item.href,
                  query: {
                    mode: "demo",
                    location: locationId,
                    persona: persona.id,
                    lang: language,
                    demoStartedAt: searchParams.get("demoStartedAt") ?? "",
                  },
                }}
              >
                {copy.navigation[item.translationKey]}
                <NavigationPendingIndicator sidebar={isSidebar} />
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
                {copy.navigation[item.translationKey]}
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
